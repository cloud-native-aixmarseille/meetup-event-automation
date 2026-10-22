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
		for (const comment of this.comments) {
			for (const status of ["approved", "rejected"] as const) {
				if (normalized === comment.issue(record, { status })) return { status };
			}
		}
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
