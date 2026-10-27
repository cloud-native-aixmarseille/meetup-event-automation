import type {
	SocialDeliveryRecord,
	SocialDispatchResult,
} from "@meetup-automation/communication";
import type { EventIdentity } from "@meetup-automation/event";
import type { ContentProposal } from "../proposals/promotional-content.js";
import type {
	SocialPublicationDependencies,
	SocialPublicationStatus,
} from "./social-publication-contracts.js";
import type { SocialPublicationIntents } from "./social-publication-intents.js";
import type { SocialPublicationReview } from "./social-publication-review.js";
import { SocialPublicationStaleError } from "./social-publication-stale-error.js";

export class SocialPublicationDelivery {
	constructor(
		private readonly dependencies: SocialPublicationDependencies,
		private readonly intents: Pick<
			SocialPublicationIntents,
			"reserve" | "update"
		>,
		private readonly review: Pick<SocialPublicationReview, "requireCurrent">,
	) {}
	async publish(
		identity: EventIdentity,
		proposal: ContentProposal,
		initial: SocialDeliveryRecord,
	): Promise<SocialPublicationStatus> {
		const destination = proposal.plan.destination;
		const gateway =
			destination && this.dependencies.gateways.get(destination.key);
		if (!destination || !proposal.draft || !proposal.revision || !gateway)
			return "blocked";
		await this.review.requireCurrent(identity, proposal, initial);
		let record = await this.intents.reserve(initial, proposal.revision);
		const guard = () => this.review.requireCurrent(identity, proposal, record);
		try {
			let media = record.attempts.at(-1)?.media;
			if (destination.provider === "linkedin" && !media) {
				const image = proposal.draft.media[0];
				if (!image || !gateway.images)
					throw new Error("LinkedIn media is unavailable");
				const loaded = await this.dependencies.imageLoader.load(image.url);
				if (
					loaded.mimeType !== image.mimeType ||
					this.dependencies.imageFingerprint.of(loaded.bytes) !==
						image.fingerprint
				)
					throw new SocialPublicationStaleError("Reviewed image changed");
				const prepared = await gateway.images.prepare(
					{
						destination,
						...loaded,
						fingerprint: image.fingerprint,
						description: image.description,
					},
					guard,
					async (preparedMedia) => {
						record = await this.intents.update(record, {
							status: "prepared",
							media: preparedMedia,
						});
					},
				);
				if (prepared.status !== "ready")
					return await this.finish(record, prepared);
				media = prepared.media;
			}
			const result = await gateway.posts.publish(
				{ destination, text: proposal.draft.text, ...(media ? { media } : {}) },
				guard,
			);
			return await this.finish(record, result);
		} catch (error) {
			return await this.failure(record, error);
		}
	}
	private async failure(
		record: SocialDeliveryRecord,
		error: unknown,
	): Promise<SocialPublicationStatus> {
		// A SocialPublicationStaleError is raised only before any provider write (the
		// reviewed-image check and the pre-write guards), so nothing was dispatched.
		// Release the reservation as stale so a corrected revision can re-publish
		// automatically, instead of parking it as an uncertain delivery that needs
		// manual recovery.
		if (error instanceof SocialPublicationStaleError) {
			await this.intents.update(record, { status: "stale" });
			return "blocked";
		}
		// Retain the reservation; unexpected I/O or persistence failures remain technical failures.
		throw new Error("Social publication failed with a retained reservation");
	}

	private async finish(
		record: SocialDeliveryRecord,
		result: SocialDispatchResult,
	): Promise<SocialPublicationStatus> {
		if (result.status === "accepted") {
			await this.intents.update(record, {
				status: "accepted",
				receipt: result.receipt,
			});
			return "published";
		}
		const retryAt =
			result.status === "deferred"
				? new Date(
						Date.parse(this.dependencies.now()) +
							Math.max(60, result.retryAfterSeconds ?? 60) * 1000,
					).toISOString()
				: undefined;
		await this.intents.update(record, {
			status: result.status,
			code: result.code,
			...(retryAt ? { retryAt } : {}),
		});
		return result.status === "uncertain"
			? "uncertain"
			: result.status === "deferred"
				? "scheduled"
				: "blocked";
	}
}
