export interface SocialJournalComment {
	readonly id: number;
	readonly node_id?: string;
	readonly body?: string | null;
	readonly user?: { readonly login: string; readonly type?: string } | null;
}

export interface SocialJournalCommentEdit {
	readonly id: string;
	readonly body: string;
	readonly lastEditedAt: string | null;
	readonly editor: {
		readonly login: string;
		readonly __typename: string;
	} | null;
}

interface SocialJournalHistoryEntry {
	readonly diff: string | null;
	readonly deletedAt: string | null;
	readonly editor: SocialJournalCommentEdit["editor"];
}

/** Runtime can bind the existing scoped GitHub approval client structurally. */
export interface SocialJournalCommentClient {
	list(): Promise<readonly SocialJournalComment[]>;
	create(body: string): Promise<number>;
	replace(commentId: number, before: string, after: string): Promise<void>;
	edit(comment: SocialJournalComment): Promise<SocialJournalCommentEdit>;
	history(
		comment: SocialJournalComment,
	): Promise<readonly SocialJournalHistoryEntry[]>;
}
