import type {
	ApprovalComment,
	ApprovalCommentEdit,
	ApprovalContentEdit,
	GithubApprovalApi,
} from "./github-approval-contracts.js";
import { GithubApprovalResponse } from "./github-approval-response.js";

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
			const raw: unknown = await this.api.rest.issues.listComments({
				owner: this.owner,
				repo: this.repo,
				issue_number: this.issue,
				page,
				per_page: 100,
			});
			const response = GithubApprovalResponse.comments(raw);
			comments.push(...response.data);
			const next = response.headers.link
				? /<[^>]+>;\s*rel="next"/.test(response.headers.link)
				: response.data.length === 100;
			if (!next) return comments;
			page += 1;
		}
	}
	async create(body: string): Promise<number> {
		if (body.length > 60000) throw new Error("Approval comment limit exceeded");
		const response: unknown = await this.api.rest.issues.createComment({
			owner: this.owner,
			repo: this.repo,
			issue_number: this.issue,
			body,
		});
		return GithubApprovalResponse.identity(response);
	}
	async update(commentId: number, body: string): Promise<void> {
		if (body.length > 60000) throw new Error("Approval comment limit exceeded");
		await this.api.rest.issues.updateComment({
			owner: this.owner,
			repo: this.repo,
			comment_id: commentId,
			body,
		});
	}
	async canApprove(username: string): Promise<boolean> {
		const response: unknown =
			await this.api.rest.repos.getCollaboratorPermissionLevel({
				owner: this.owner,
				repo: this.repo,
				username,
			});
		const permission = GithubApprovalResponse.permission(response);
		return ["write", "maintain", "admin"].includes(permission);
	}
	async replace(
		commentId: number,
		before: string,
		after: string,
	): Promise<void> {
		if (before === after) return;
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
		const result = await this.api.graphql<unknown>(
			`query ApprovalCommentEditor($id: ID!) {
				node(id: $id) {
					... on IssueComment {
						id body lastEditedAt editor { login __typename }
					}
				}
			}`,
			{ id: comment.node_id },
		);
		return GithubApprovalResponse.edit(result, comment);
	}
	url(commentId: number): string {
		return `https://github.com/${this.owner}/${this.repo}/issues/${this.issue}#issuecomment-${commentId}`;
	}
	async history(
		comment: ApprovalComment,
	): Promise<readonly ApprovalContentEdit[]> {
		if (!comment.node_id)
			throw new Error("Missing approval comment node identity");
		const edits: ApprovalContentEdit[] = [];
		let after: string | undefined;
		do {
			const response: unknown = await this.api.graphql<unknown>(
				`query ApprovalCommentHistory($id: ID!, $after: String) {
				node(id: $id) { ... on IssueComment {
					id body userContentEdits(first: 100, after: $after) {
						nodes { diff deletedAt editor { login __typename } }
						pageInfo { hasNextPage endCursor }
					}
				} }
			}`,
				{ id: comment.node_id, ...(after ? { after } : {}) },
			);
			const history = GithubApprovalResponse.history(response, comment);
			edits.push(...history.nodes);
			if (!history.pageInfo.hasNextPage) return edits;
			const next = history.pageInfo.endCursor;
			if (!next || next === after)
				throw new Error("Invalid approval history cursor");
			after = next;
		} while (after);
		return edits;
	}
}
