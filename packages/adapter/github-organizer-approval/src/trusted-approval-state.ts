import {
	APPROVAL_MARKER,
	ApprovalCommentCodec,
} from "./approval-comment-codec.js";
import type { StoredApproval } from "./approval-state.js";
import type { GithubApprovalClient } from "./github-approval-client.js";
import type {
	ApprovalComment,
	ApprovalCommentEdit,
} from "./github-approval-contracts.js";

/** Request metadata and final decisions must come from a verified bot revision. */
export class TrustedApprovalState {
	constructor(
		private readonly client: GithubApprovalClient,
		private readonly authorLogin: string,
	) {}
	async read(comment: ApprovalComment): Promise<StoredApproval | undefined> {
		const current = await this.client.edit(comment);
		if (
			this.isAuthor(current.editor) ||
			(!current.editor && current.lastEditedAt === null)
		)
			return this.record(current.body);
		for (const edit of await this.client.history(comment)) {
			if (edit.deletedAt) throw new Error("Approval history was deleted");
			if (this.isAuthor(edit.editor)) {
				if (edit.diff === null)
					throw new Error("Approval history is unavailable");
				return this.record(edit.diff);
			}
		}
		throw new Error("A trusted approval revision could not be verified");
	}
	private record(body: string | null): StoredApproval | undefined {
		if (!body?.startsWith(APPROVAL_MARKER)) return undefined;
		return ApprovalCommentCodec.read(body);
	}
	private isAuthor(editor: ApprovalCommentEdit["editor"]): boolean {
		return (
			editor?.__typename === "Bot" &&
			editor.login.toLowerCase().replace(/\[bot\]$/, "") ===
				this.authorLogin.toLowerCase().replace(/\[bot\]$/, "")
		);
	}
}
