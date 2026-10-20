type AttentionHistoryResponse = {
	node: {
		id: string;
		body: string;
		userContentEdits: {
			nodes: readonly AttentionContentEdit[];
			pageInfo: { hasNextPage: boolean; endCursor: string | null };
		};
	} | null;
};

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

/** Scoped issue and permission access. No issue text is executable input. */
export class GithubAttentionClient {
	constructor(
		private readonly api: GithubAttentionApi,
		private readonly owner: string,
		private readonly repo: string,
		private readonly issue: number,
	) {}
	async list(): Promise<readonly AttentionComment[]> {
		const comments: AttentionComment[] = [];
		let page = 1;
		while (page <= 20) {
			const response = await this.api.rest.issues.listComments({
				owner: this.owner,
				repo: this.repo,
				issue_number: this.issue,
				page,
				per_page: 100,
			});
			if (!Array.isArray(response.data))
				throw new Error("Invalid attention comment response");
			comments.push(...response.data);
			const next = response.headers.link
				? /<[^>]+>;\s*rel="next"/.test(response.headers.link)
				: response.data.length === 100;
			if (!next) return comments;
			page += 1;
		}
		throw new Error("Attention comment limit exceeded");
	}
	async create(body: string): Promise<number> {
		const response = await this.api.rest.issues.createComment({
			owner: this.owner,
			repo: this.repo,
			issue_number: this.issue,
			body,
		});
		if (!Number.isSafeInteger(response.data.id) || response.data.id <= 0)
			throw new Error("Invalid attention comment identity");
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
	async replace(
		commentId: number,
		before: string,
		after: string,
	): Promise<void> {
		const current = (await this.list()).find(
			(comment) => comment.id === commentId,
		);
		if (current?.body !== before)
			throw new Error("Attention comment changed before persistence");
		await this.update(commentId, after);
	}
	async remove(commentId: number, before: string): Promise<void> {
		const current = (await this.list()).find(
			(comment) => comment.id === commentId,
		);
		if (current?.body !== before)
			throw new Error("Attention comment changed before removal");
		await this.api.rest.issues.deleteComment({
			owner: this.owner,
			repo: this.repo,
			comment_id: commentId,
		});
	}
	async edit(comment: AttentionComment): Promise<AttentionCommentEdit> {
		if (!comment.node_id)
			throw new Error("Missing attention comment node identity");
		const result = await this.api.graphql<{
			node: AttentionCommentEdit | null;
		}>(
			`query AttentionCommentEditor($id: ID!) {
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
			throw new Error("Attention comment changed during verification");
		return result.node;
	}
	private static checkHistoryLimit(count: number): void {
		if (count > 2000) throw new Error("Attention history limit exceeded");
	}
	async history(
		comment: AttentionComment,
	): Promise<readonly AttentionContentEdit[]> {
		if (!comment.node_id)
			throw new Error("Missing attention comment node identity");
		const edits: AttentionContentEdit[] = [];
		let after: string | undefined;
		do {
			const response: AttentionHistoryResponse =
				await this.api.graphql<AttentionHistoryResponse>(
					`query AttentionCommentHistory($id: ID!, $after: String) {
				node(id: $id) { ... on IssueComment {
					id body userContentEdits(first: 100, after: $after) {
						nodes { diff deletedAt editor { login __typename } }
						pageInfo { hasNextPage endCursor }
					}
				} }
			}`,
					{ id: comment.node_id, ...(after ? { after } : {}) },
				);
			if (
				response.node?.id !== comment.node_id ||
				response.node.body !== comment.body
			)
				throw new Error(
					"Attention comment changed during history verification",
				);
			const history = response.node.userContentEdits;
			if (!Array.isArray(history?.nodes) || !history.pageInfo)
				throw new Error("Attention history is unavailable");
			edits.push(...history.nodes);
			GithubAttentionClient.checkHistoryLimit(edits.length);
			if (!history.pageInfo.hasNextPage) return edits;
			const next = history.pageInfo.endCursor;
			if (!next || next === after)
				throw new Error("Invalid attention history cursor");
			after = next;
		} while (after);
		return edits;
	}
}
