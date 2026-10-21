import type { ApprovalPresenter } from "./approval-presenter.js";
import type { ApprovalDecision, StoredApproval } from "./approval-record.js";

/** Accept only a checkbox edit of an exact request rendered from trusted metadata. */
export class ApprovalDecisionParser {
	constructor(
		private readonly comments: readonly Pick<ApprovalPresenter, "issue">[],
	) {}
	parse(record: StoredApproval, body: string): ApprovalDecision {
		if (
			record.decision ||
			record.recipientCount === 0 ||
			record.followUp?.active === false
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
