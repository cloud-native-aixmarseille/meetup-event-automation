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
export interface GithubApprovalApi {
	graphql<Response>(
		query: string,
		variables: { id: string },
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

/** Scoped issue and permission access. No issue text is executable input. */
export class GithubApprovalClient {
	constructor(
		private readonly api: GithubApprovalApi,
		private readonly owner: string,
		private readonly repo: string,
		private readonly issue: number,
	) {}
	async list(): Promise<readonly ApprovalComment[]> {
		const comments: ApprovalComment[] = [];
		let page = 1;
		while (true) {
			const response = await this.api.rest.issues.listComments({
				owner: this.owner,
				repo: this.repo,
				issue_number: this.issue,
				page,
				per_page: 100,
			});
			if (!Array.isArray(response.data))
				throw new Error("Invalid approval comment response");
			comments.push(...response.data);
			const next = response.headers.link
				? /<[^>]+>;\s*rel="next"/.test(response.headers.link)
				: response.data.length === 100;
			if (!next) return comments;
			page += 1;
		}
	}
	async create(body: string): Promise<number> {
		const response = await this.api.rest.issues.createComment({
			owner: this.owner,
			repo: this.repo,
			issue_number: this.issue,
			body,
		});
		if (!Number.isSafeInteger(response.data.id) || response.data.id <= 0)
			throw new Error("Invalid approval comment identity");
		return response.data.id;
	}
	async update(commentId: number, body: string): Promise<void> {
		await this.api.rest.issues.updateComment({
			owner: this.owner,
			repo: this.repo,
			comment_id: commentId,
			body,
		});
	}
	async canApprove(username: string): Promise<boolean> {
		const response = await this.api.rest.repos.getCollaboratorPermissionLevel({
			owner: this.owner,
			repo: this.repo,
			username,
		});
		return (
			response.data.permission === "write" ||
			response.data.permission === "admin"
		);
	}
	async replace(
		commentId: number,
		before: string,
		after: string,
	): Promise<void> {
		const current = (await this.list()).find(
			(comment) => comment.id === commentId,
		);
		if (current?.body !== before)
			throw new Error("Approval comment changed before persistence");
		await this.update(commentId, after);
	}
	async edit(comment: ApprovalComment): Promise<ApprovalCommentEdit> {
		if (!comment.node_id)
			throw new Error("Missing approval comment node identity");
		const result = await this.api.graphql<{ node: ApprovalCommentEdit | null }>(
			`query ApprovalCommentEditor($id: ID!) {
				node(id: $id) {
					... on IssueComment {
						id body lastEditedAt editor { login __typename }
					}
				}
			}`,
			{ id: comment.node_id },
		);
		if (
			result.node?.id !== comment.node_id ||
			result.node.body !== comment.body
		)
			throw new Error("Approval comment changed during verification");
		return result.node;
	}
	url(commentId: number): string {
		return `https://github.com/${this.owner}/${this.repo}/issues/${this.issue}#issuecomment-${commentId}`;
	}
}
