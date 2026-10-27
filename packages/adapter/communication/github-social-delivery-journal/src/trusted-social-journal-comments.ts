import type {
	SocialJournalComment,
	SocialJournalCommentClient,
	SocialJournalCommentEdit,
} from "./social-journal-comment-client.js";

export const SOCIAL_JOURNAL_MARKER = "<!-- meetup-social-delivery:v1 ";

/** Reject altered history before a missing record can look like unsent work. */
export class TrustedSocialJournalComments {
	constructor(
		private readonly client: Pick<
			SocialJournalCommentClient,
			"list" | "edit" | "history"
		>,
		private readonly author: string,
	) {
		if (!/^[a-z\d-]+\[bot\]$/i.test(author))
			throw new Error("Social delivery requires a trusted GitHub App bot");
	}

	async list(): Promise<readonly SocialJournalComment[]> {
		const records: SocialJournalComment[] = [];
		for (const comment of await this.client.list()) {
			if (
				comment.user?.type !== "Bot" ||
				comment.user.login.toLowerCase() !== this.author.toLowerCase()
			)
				continue;
			const current = await this.client.edit(comment);
			if (current.body !== comment.body || current.id !== comment.node_id)
				throw new Error("Social delivery history changed during verification");
			const managed = current.body.startsWith(SOCIAL_JOURNAL_MARKER);
			if (current.lastEditedAt !== null || current.editor !== null)
				await this.verifyHistory(comment, current, managed);
			if (managed) records.push(comment);
		}
		return records;
	}

	private async verifyHistory(
		comment: SocialJournalComment,
		current: SocialJournalCommentEdit,
		managed: boolean,
	): Promise<void> {
		if (!current.editor)
			throw new Error("Social delivery history editor is unavailable");
		const history = await this.client.history(comment);
		if (
			history.length === 0 ||
			history.some((edit) => edit.deletedAt || edit.diff === null)
		)
			throw new Error("Social delivery history is unavailable");
		const previouslyManaged = history.some((edit) =>
			edit.diff?.startsWith(SOCIAL_JOURNAL_MARKER),
		);
		if (!managed && !previouslyManaged) return;
		if (
			!managed ||
			!this.trusted(current.editor) ||
			history.some((edit) => !this.trusted(edit.editor))
		)
			throw new Error("Social delivery history was edited outside automation");
	}

	private trusted(editor: SocialJournalCommentEdit["editor"]): boolean {
		return (
			editor?.__typename === "Bot" &&
			editor.login.toLowerCase().replace(/\[bot\]$/, "") ===
				this.author.toLowerCase().replace(/\[bot\]$/, "")
		);
	}
}
