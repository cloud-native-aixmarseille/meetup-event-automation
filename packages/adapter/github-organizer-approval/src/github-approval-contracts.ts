export interface ApprovalComment {
	readonly id: number;
	readonly node_id?: string;
	readonly body?: string | null;
	readonly created_at?: string;
	readonly updated_at?: string;
	readonly user?: { readonly login: string; readonly type?: string } | null;
}
export interface ApprovalCommentEdit {
	readonly id: string;
	readonly body: string;
	readonly lastEditedAt: string | null;
	readonly editor: {
		readonly login: string;
		readonly __typename: string;
	} | null;
}
export interface ApprovalContentEdit {
	readonly diff: string | null;
	readonly deletedAt: string | null;
	readonly editor: ApprovalCommentEdit["editor"];
}
export interface GithubApprovalApi {
	graphql<Response>(
		query: string,
		variables: { id: string; after?: string },
	): Promise<Response>;
	readonly rest: {
		readonly issues: {
			listComments(input: {
				owner: string;
				repo: string;
				issue_number: number;
				page: number;
				per_page: number;
			}): Promise<{
				data: readonly ApprovalComment[];
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
		readonly repos: {
			getCollaboratorPermissionLevel(input: {
				owner: string;
				repo: string;
				username: string;
			}): Promise<{ data: { permission: string } }>;
		};
	};
}
