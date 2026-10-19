import type {
	ContentMedia,
	ContentMediaStore,
} from "@meetup-automation/publication";
import type { ImageGeneration } from "../ports/generation.js";
import type {
	ContentDraft,
	ContentProposal,
	PromotionalContentSnapshot,
} from "../proposals/promotional-content.js";
import type { PromotionalContentFingerprint } from "../proposals/promotional-content-fingerprint.js";
import type { PromotionalContentPolicy } from "../proposals/promotional-content-policy.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";
import type { CoverArtworkDrafts } from "./cover-artwork-drafts.js";

/** Creates four separate artwork candidates, preserving each uncertain upload identity. */
export class GenerateCoverArtwork {
	constructor(
		private readonly store: ContentProposalStore,
		private readonly generator: ImageGeneration,
		private readonly media: ContentMediaStore,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"proposal"
		>,
		private readonly policy: Pick<
			PromotionalContentPolicy,
			"ready" | "validDraft"
		>,
		private readonly artwork: CoverArtworkDrafts,
	) {}
	async execute(id: string): Promise<"complete" | "blocked" | "recovery"> {
		const snapshot = await this.store.load();
		const proposal = snapshot.proposals.find((item) => item.id === id);
		if (!proposal || !this.artwork.supports(proposal.plan.target))
			throw new Error("Cover proposal was not found");
		if (proposal.draft)
			return proposal.attempts.some((attempt) => attempt.phase !== "complete")
				? "recovery"
				: "complete";
		if (!this.policy.ready(proposal.plan)) return "blocked";
		if (!this.generator.supported()) throw new Error("Unsupported image model");
		if (
			proposal.origin.kind !== "ai" ||
			proposal.origin.provider !== this.generator.provider ||
			proposal.origin.model !== this.generator.model
		)
			throw new Error("Image generation origin mismatch");
		return this.cover(snapshot, proposal);
	}
	private async cover(
		snapshot: PromotionalContentSnapshot,
		initial: ContentProposal,
	): Promise<"complete" | "recovery"> {
		let proposal = initial;
		if (this.artwork.directions().length !== 4)
			throw new Error("Missing independent cover directions");
		for (let slot = 0; slot < 4; slot++) {
			const attempt = proposal.attempts[slot];
			if (attempt?.phase === "complete") continue;
			if (attempt) {
				const recovered = await this.media.read(attempt.id);
				if (!recovered) {
					await this.partial(snapshot, proposal);
					return "recovery";
				}
				proposal = this.completedSlot(proposal, slot, recovered);
				snapshot = await this.save(snapshot, proposal);
				continue;
			}
			const id = await this.media.reserve();
			proposal = {
				...proposal,
				attempts: [...proposal.attempts, { id, phase: "reserved" }],
			};
			snapshot = await this.save(snapshot, proposal);
			try {
				const direction = this.artwork.directions()[slot];
				const image = await this.generator.generate(
					this.artwork.brief(proposal.plan, direction, proposal.guidance),
				);
				const saved = await this.media.persist(
					id,
					{ bytes: image.bytes, mimeType: image.mimeType },
					`${proposal.plan.facts.month} · ${direction}`,
				);
				proposal = this.completedSlot(proposal, slot, saved);
				snapshot = await this.save(snapshot, proposal);
			} catch (error) {
				await this.partial(snapshot, proposal);
				throw error;
			}
		}
		await this.partial(snapshot, proposal);
		return "complete";
	}
	private completedSlot(
		proposal: ContentProposal,
		slot: number,
		media: ContentMedia,
	): ContentProposal {
		return {
			...proposal,
			attempts: proposal.attempts.map((item, index) =>
				index === slot ? { id: item.id, phase: "complete", media } : item,
			),
		};
	}
	private async partial(
		snapshot: PromotionalContentSnapshot,
		proposal: ContentProposal,
	): Promise<void> {
		const media = proposal.attempts.flatMap((attempt) =>
			attempt.media ? [attempt.media] : [],
		);
		if (media.length)
			await this.complete(snapshot, proposal, { text: "", media });
	}
	private async complete(
		snapshot: PromotionalContentSnapshot,
		proposal: ContentProposal,
		draft: ContentDraft,
	): Promise<void> {
		if (!this.policy.validDraft(proposal.plan, draft))
			throw new Error(
				"Generated content does not satisfy the proposal contract",
			);
		await this.save(snapshot, {
			...proposal,
			draft,
			revision: this.fingerprints.proposal(proposal, draft),
		});
	}
	private save(
		snapshot: PromotionalContentSnapshot,
		proposal: ContentProposal,
	): Promise<PromotionalContentSnapshot> {
		return this.store.save(
			snapshot,
			snapshot.proposals.map((item) =>
				item.id === proposal.id ? proposal : item,
			),
		);
	}
}
