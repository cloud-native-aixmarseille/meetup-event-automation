import type { ApprovalRequestPolicy } from "@meetup-automation/journey";
import type { ApprovalPresenter } from "./approval-presenter.js";
import type { ApprovalDecision, StoredApproval } from "./approval-state.js";

/** Accept only a checkbox edit of an exact request rendered from trusted metadata. */
export class ApprovalDecisionParser {
	constructor(
		private readonly policy: Pick<ApprovalRequestPolicy, "reviewPhase">,
		private readonly comments: readonly Pick<ApprovalPresenter, "issue">[],
	) {}
	parse(record: StoredApproval, body: string): ApprovalDecision {
		if (
			this.policy.reviewPhase({
				recipientCount: record.recipientCount,
				followUpActive: record.followUp?.active,
				decided: record.decision !== undefined,
			}) !== "pending"
		)
			return { status: "pending" };

		const normalized = body.replace(/\r\n/g, "\n").replace(/- \[X\]/g, "- [x]");
		if (record.kind === "content-review")
			return this.content(record, normalized);
		for (const comment of this.comments) {
			for (const status of ["approved", "rejected"] as const) {
				if (normalized === comment.issue(record, { status })) return { status };
			}
		}
		return { status: "pending" };
	}
	private content(
		record: StoredApproval<"content-review">,
		body: string,
	): ApprovalDecision {
		const approvals: ApprovalDecision[] =
			record.content.target === "cover"
				? record.content.draft.media.map((media) => ({
						status: "approved",
						selectedImage: media.id,
					}))
				: [{ status: "approved" }];
		for (const decision of [
			...approvals,
			{ status: "rejected" } as const,
			{ status: "iteration-requested" } as const,
		])
			if (
				this.comments.some(
					(comment) => comment.issue(record, decision) === body,
				)
			)
				return decision;
		return { status: "pending" };
	}
}
export type ApprovalDecisionParserArguments =
	ConstructorParameters<typeof ApprovalDecisionParser> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
