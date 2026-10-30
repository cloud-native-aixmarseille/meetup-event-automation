import type { ContentMediaStore } from "@meetup-automation/publication";
import type {
	OrganizerApproval,
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "../ports/organizer-approval.js";
import type {
	ContentDraft,
	ContentPlan,
	ContentProposal,
} from "../proposals/promotional-content.js";
import type { PromotionalContentPolicy } from "../proposals/promotional-content-policy.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";

export class ContentReview {
	constructor(
		private readonly store: ContentProposalStore,
		private readonly approvals: OrganizerApproval,
		private readonly media: ContentMediaStore,
		private readonly policy: Pick<
			PromotionalContentPolicy,
			"current" | "validDraft"
		>,
	) {}
	async review(
		proposal: ContentProposal,
		plan: ContentPlan,
	): Promise<
		| "stale"
		| "pending"
		| "approved"
		| "rejected"
		| "iteration-requested"
		| "invalid"
	> {
		if (
			!this.policy.current(proposal, plan) ||
			!proposal.draft ||
			!this.policy.validDraft(plan, proposal.draft)
		)
			return "stale";
		for (const image of proposal.draft.media)
			if (!(await this.media.verify(image))) return "stale";
		const result = await this.approvals.request(
			this.request(proposal),
			(text) =>
				this.policy.validDraft(plan, {
					text,
					media: proposal.draft?.media ?? [],
				}),
		);
		if (result.notificationFailed)
			throw new Error(
				"Content approval notification failed; the stored request can be retried",
			);
		if (
			result.invalidText ||
			(result.editedText !== undefined &&
				(plan.target === "cover" ||
					!this.policy.validDraft(plan, {
						...proposal.draft,
						text: result.editedText,
					})))
		)
			return "invalid";
		if (result.status === "pending") return "pending";
		await this.saveDecision(proposal, { ...result, status: result.status });
		return result.status;
	}
	private async saveDecision(
		proposal: ContentProposal,
		result: OrganizerApprovalResult & {
			status: "approved" | "rejected" | "iteration-requested";
		},
	): Promise<void> {
		if (!result.actor || !result.decidedAt)
			throw new Error("Content decision provenance is unavailable");
		const snapshot = await this.store.load();
		const current = snapshot.proposals.find((item) => item.id === proposal.id);
		if (!current || current.revision !== proposal.revision)
			throw new Error("Content changed during review");
		const decision = {
			status: result.status,
			actor: result.actor,
			decidedAt: result.decidedAt,
			...(result.editedText === undefined
				? {}
				: { editedText: result.editedText }),
			...(result.selectedImage ? { selectedImage: result.selectedImage } : {}),
		};
		if (!current.decision)
			await this.store.save(
				snapshot,
				snapshot.proposals.map((item) =>
					item.id === current.id ? { ...item, decision } : item,
				),
			);
	}
	async approved(
		proposal: ContentProposal,
		plan: ContentPlan,
	): Promise<ContentDraft | undefined> {
		if ((await this.review(proposal, plan)) !== "approved") return undefined;
		const current = (await this.store.load()).proposals.find(
			(item) => item.id === proposal.id,
		);
		if (!current?.draft || current.decision?.status !== "approved")
			return undefined;
		if (plan.target !== "cover")
			return {
				...current.draft,
				text: current.decision.editedText ?? current.draft.text,
			};
		const selected = current.draft.media.find(
			(image) => image.id === current.decision?.selectedImage,
		);
		return selected ? { text: "", media: [selected] } : undefined;
	}
	private request(
		proposal: ContentProposal,
	): Extract<OrganizerApprovalRequest, { kind: "content-review" }> {
		if (!proposal.draft || !proposal.revision)
			throw new Error("Incomplete content review request");
		return {
			kind: "content-review",
			revision: proposal.revision,
			eventDate: proposal.plan.facts.date,
			requestedAt: proposal.createdAt,
			content: {
				key: proposal.id,
				...(proposal.plan.plannedAt
					? { plannedAt: proposal.plan.plannedAt }
					: {}),
				...(proposal.plan.target === "cover" && proposal.origin.kind === "ai"
					? {
							attempts: [0, 1, 2, 3].map(
								(slot) =>
									proposal.attempts[slot]?.phase ?? ("not-started" as const),
							),
						}
					: {}),
				target: proposal.plan.target,
				language: proposal.plan.language,
				origin:
					proposal.origin.kind === "ai"
						? `${proposal.origin.provider}/${proposal.origin.model}`
						: proposal.origin.login,
				draft: proposal.draft,
			},
		};
	}
}
