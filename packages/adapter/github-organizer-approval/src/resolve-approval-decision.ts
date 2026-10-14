import type { ApprovalPresenter } from "./approval-presenter.js";
import type { ApprovalDecision, StoredApproval } from "./approval-record.js";
import type {
	ApprovalComment,
	GithubApprovalClient,
} from "./github-approval-client.js";

/** Verify the editor of the exact current request, never its original bot author. */
export class ResolveApprovalDecision {
	constructor(
		private readonly client: GithubApprovalClient,
		private readonly presenter: ApprovalPresenter,
	) {}
	async execute(
		record: StoredApproval,
		comment: ApprovalComment,
	): Promise<ApprovalDecision> {
		if (record.decision) return record.decision;
		const decision = this.presenter.decision(record, comment.body ?? "");
		if (decision.status === "pending") return decision;
		const edit = await this.client.edit(comment);
		const editedAt = Date.parse(edit.lastEditedAt ?? "");
		if (
			edit.editor?.__typename !== "User" ||
			!edit.editor.login ||
			edit.editor.login === "ghost" ||
			!Number.isFinite(editedAt) ||
			editedAt < Math.floor(Date.parse(record.requestedAt) / 1000) * 1000
		)
			return { status: "pending" };
		return (await this.client.canApprove(edit.editor.login))
			? {
					...decision,
					actor: edit.editor.login,
					decidedAt: edit.lastEditedAt ?? undefined,
				}
			: { status: "pending" };
	}
}
