import type { GenerationBrief, TextGeneration } from "../ports/generation.js";
import type {
	ContentDraft,
	ContentProposal,
	PromotionalContentSnapshot,
} from "../proposals/promotional-content.js";
import type { PromotionalContentFingerprint } from "../proposals/promotional-content-fingerprint.js";
import type { PromotionalContentPolicy } from "../proposals/promotional-content-policy.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";

export interface TextProposalDefinition {
	supports(target: ContentProposal["plan"]["target"]): boolean;
	brief(plan: ContentProposal["plan"], guidance: string): GenerationBrief;
	media(plan: ContentProposal["plan"]): ContentDraft["media"];
}
/** Owns the durable text request; the injected business definition owns its wording. */
export class GenerateTextProposal {
	constructor(
		private readonly store: ContentProposalStore,
		private readonly generator: TextGeneration,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"proposal"
		>,
		private readonly policy: Pick<
			PromotionalContentPolicy,
			"ready" | "validDraft"
		>,
		private readonly definition: TextProposalDefinition,
	) {}
	async execute(id: string): Promise<"complete" | "blocked" | "recovery"> {
		const snapshot = await this.store.load();
		const proposal = snapshot.proposals.find((item) => item.id === id);
		if (!proposal) throw new Error("Text proposal was not found");
		if (!this.definition.supports(proposal.plan.target))
			throw new Error("Unsupported text proposal target");
		if (proposal.draft)
			return proposal.attempts.some((attempt) => attempt.phase !== "complete")
				? "recovery"
				: "complete";
		if (!this.policy.ready(proposal.plan)) return "blocked";
		if (!this.generator.supported()) throw new Error("Unsupported text model");
		if (
			proposal.origin.kind !== "ai" ||
			proposal.origin.provider !== this.generator.provider ||
			proposal.origin.model !== this.generator.model
		)
			throw new Error("Text generation origin mismatch");
		if (proposal.attempts.length) return "recovery";
		const reserved: ContentProposal = {
			...proposal,
			attempts: [{ id: `${id}:text`, phase: "reserved" }],
		};
		const persisted = await this.save(snapshot, reserved);
		const text = await this.generator.generate(
			this.definition.brief(reserved.plan, reserved.guidance),
		);
		await this.complete(
			persisted,
			{
				...reserved,
				attempts: reserved.attempts.map((item) => ({
					...item,
					phase: "complete",
				})),
			},
			{ text, media: this.definition.media(reserved.plan) },
		);
		return "complete";
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
