export interface GithubLedgerComment {
	id: number;
	body: string;
	authorLogin?: string;
}

export interface GithubLedgerCommentClient {
	listComments(): Promise<readonly GithubLedgerComment[]>;
	createComment(body: string): Promise<void>;
	updateComment(commentId: number, body: string): Promise<void>;
}
