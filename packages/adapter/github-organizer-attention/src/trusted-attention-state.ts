import type { GithubAttentionClient } from "./github-attention-client.js";
import type {
	AttentionComment,
	AttentionCommentEdit,
} from "./github-attention-contracts.js";
/** Human-editable metadata is never delivery authority. Recover the last bot revision. */
export class TrustedAttentionState {
	constructor(
		private readonly client: GithubAttentionClient,
		private readonly author: string,
	) {}
	async body(comment: AttentionComment): Promise<string> {
		if (
			comment.user?.type !== "Bot" ||
			comment.user.login.toLowerCase() !== this.author.toLowerCase()
		)
			throw new Error("Untrusted attention author");
		const current = await this.client.edit(comment);
		if (
			this.isAuthor(current.editor) ||
			(!current.editor && current.lastEditedAt === null)
		)
			return current.body;
		for (const edit of await this.client.history(comment)) {
			if (edit.deletedAt) throw new Error("Attention history was deleted");
			if (this.isAuthor(edit.editor)) {
				if (edit.diff === null)
					throw new Error("Attention history is unavailable");
				return edit.diff;
			}
		}
		throw new Error("Trusted attention history is unavailable");
	}
	private isAuthor(editor: AttentionCommentEdit["editor"]): boolean {
		return (
			editor?.__typename === "Bot" &&
			editor.login.toLowerCase().replace(/\[bot\]$/, "") ===
				this.author.toLowerCase().replace(/\[bot\]$/, "")
		);
	}
}
