import type {
	SocialDeliveryRecord,
	SocialPostMilestone,
} from "@meetup-automation/communication";
import type { EventIdentity } from "@meetup-automation/event";
import type { ContentProposal } from "../proposals/promotional-content.js";
import type { SocialPublicationDependencies } from "./social-publication-contracts.js";

export class SocialPublicationIntents {
	constructor(private readonly dependencies: SocialPublicationDependencies) {}
	async anchor(
		identity: EventIdentity,
		proposal: ContentProposal,
	): Promise<SocialDeliveryRecord> {
		const destination = proposal.plan.destination;
		if (!destination) throw new Error("Social destination is missing");
		const purpose = proposal.plan.target.split(":")[1] as SocialPostMilestone;
		const intentId = this.dependencies.fingerprints.digest({
			identity,
			occurrence: proposal.plan.facts.date,
			purpose,
			provider: destination.provider,
			remote:
				destination.provider === "slack"
					? [destination.workspaceId, destination.channelId]
					: destination.organizationUrn,
		});
		const snapshot = await this.dependencies.store.load();
		const existing = await this.dependencies.journal.load(intentId);
		if (
			!existing &&
			snapshot.proposals.some((item) => item.publicationIntent === intentId)
		)
			throw new Error("Social delivery journal is missing");
		const record = existing ?? {
			intentId,
			occurrence: proposal.plan.facts.date,
			purpose,
			destination,
			attempts: [],
		};
		if (!existing) await this.dependencies.journal.save(undefined, record);
		if (proposal.publicationIntent && proposal.publicationIntent !== intentId)
			throw new Error("Social publication identity changed");
		await this.dependencies.store.save(
			snapshot,
			snapshot.proposals.map((item) =>
				item.id === proposal.id
					? { ...item, publicationIntent: intentId }
					: item,
			),
		);
		return record;
	}
	async update(
		record: SocialDeliveryRecord,
		patch: Partial<SocialDeliveryRecord["attempts"][number]>,
	): Promise<SocialDeliveryRecord> {
		const attempt = record.attempts.at(-1);
		if (!attempt) throw new Error("Social publication reservation missing");
		const next = {
			...record,
			attempts: [...record.attempts.slice(0, -1), { ...attempt, ...patch }],
		};
		await this.dependencies.journal.save(record, next);
		return next;
	}
	async reserve(
		record: SocialDeliveryRecord,
		revision: string,
	): Promise<SocialDeliveryRecord> {
		const previous = record.attempts.at(-1);
		const carry =
			previous?.revision === revision &&
			previous.recovery?.outcome !== "not-published"
				? previous.media
				: undefined;
		const next: SocialDeliveryRecord = {
			...record,
			attempts: [
				...record.attempts,
				{
					id: this.dependencies.createId(),
					revision,
					reservedAt: this.dependencies.now(),
					status: "reserved",
					...(carry ? { media: carry } : {}),
				},
			],
		};
		await this.dependencies.journal.save(record, next);
		return next;
	}
}
