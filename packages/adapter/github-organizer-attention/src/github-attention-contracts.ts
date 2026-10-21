export interface AttentionComment {
	readonly id: number;
	readonly node_id?: string;
	readonly body?: string | null;
	readonly created_at?: string;
	readonly updated_at?: string;
	readonly user?: { readonly login: string; readonly type?: string } | null;
}
export interface AttentionCommentEdit {
	readonly id: string;
	readonly body: string;
	readonly lastEditedAt: string | null;
	readonly editor: {
		readonly login: string;
		readonly __typename: string;
	} | null;
}
export interface AttentionContentEdit {
	readonly diff: string | null;
	readonly deletedAt: string | null;
	readonly editor: AttentionCommentEdit["editor"];
}
export interface GithubAttentionApi {
	graphql<Response>(
		query: string,
		variables: { id: string; after?: string },
	): Promise<Response>;
	readonly rest: {
		readonly issues: {
			deleteComment(input: {
				owner: string;
				repo: string;
				comment_id: number;
			}): Promise<unknown>;
			listComments(input: {
				owner: string;
				repo: string;
				issue_number: number;
				page: number;
				per_page: number;
			}): Promise<{
				data: readonly AttentionComment[];
				headers: { link?: string };
			}>;
			createComment(input: {
				owner: string;
				repo: string;
				issue_number: number;
				body: string;
			}): Promise<{ data: { id: number } }>;
			updateComment(input: {
				owner: string;
				repo: string;
				comment_id: number;
				body: string;
			}): Promise<unknown>;
		};
	};
}
