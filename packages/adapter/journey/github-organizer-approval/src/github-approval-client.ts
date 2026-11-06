import { OrganizerCommentChangedError } from "@meetup-automation/journey";
import type {
	ApprovalComment,
	ApprovalCommentEdit,
	ApprovalContentEdit,
	GithubApprovalApi,
} from "./github-approval-contracts.js";
import type { GithubApprovalResponse } from "./github-approval-response.js";

/** Scoped issue and permission access. No issue text is executable input. */
export interface GithubApprovalClientCollaborators {
	readonly githubApprovalResponse: Pick<
		GithubApprovalResponse,
		| "comments"
		| "identity"
		| "permission"
		| "edit"
		| "edits"
		| "history"
		| "histories"
	>;
}

export class GithubApprovalClient {
	constructor(
		private readonly collaborators: GithubApprovalClientCollaborators,
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
			const response = this.collaborators.githubApprovalResponse.comments(raw);
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
		return this.collaborators.githubApprovalResponse.identity(response);
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
		const permission =
			this.collaborators.githubApprovalResponse.permission(response);
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
		if (!current || typeof current.body !== "string")
			throw new Error("Approval comment is unavailable before persistence");
		if (current.body !== before) throw new OrganizerCommentChangedError();
		await this.update(commentId, after);
	}
	async edits(
		comments: readonly ApprovalComment[],
	): Promise<readonly ApprovalCommentEdit[]> {
		const edits: ApprovalCommentEdit[] = [];
		for (let start = 0; start < comments.length; start += 100) {
			const batch = comments.slice(start, start + 100);
			const ids = batch.map((comment) => {
				if (!comment.node_id)
					throw new Error("Missing approval comment node identity");
				return comment.node_id;
			});
			const response = await this.api.graphql<unknown>(
				`query ApprovalCommentEditors($ids: [ID!]!) {
					nodes(ids: $ids) { ... on IssueComment {
						id body lastEditedAt editor { login __typename }
					} }
				}`,
				{ ids },
			);
			edits.push(
				...this.collaborators.githubApprovalResponse.edits(response, batch),
			);
		}
		return edits;
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
		return this.collaborators.githubApprovalResponse.edit(result, comment);
	}
	url(commentId: number): string {
		return `https://github.com/${this.owner}/${this.repo}/issues/${this.issue}#issuecomment-${commentId}`;
	}
	async history(
		comment: ApprovalComment,
	): Promise<readonly ApprovalContentEdit[]> {
		return this.historyPages(comment, undefined);
	}

	async histories(
		comments: readonly ApprovalComment[],
	): Promise<readonly (readonly ApprovalContentEdit[])[]> {
		const histories: (readonly ApprovalContentEdit[])[] = [];
		// Bound response size while sharing the minimum GraphQL request cost.
		for (let start = 0; start < comments.length; start += 5) {
			const batch = comments.slice(start, start + 5);
			const ids = batch.map((comment) => {
				if (!comment.node_id)
					throw new Error("Missing approval comment node identity");
				return comment.node_id;
			});
			const response = await this.api.graphql<unknown>(
				`query ApprovalCommentHistories($ids: [ID!]!) {
					nodes(ids: $ids) { ... on IssueComment {
						id body userContentEdits(first: 20) {
							nodes { diff deletedAt editor { login __typename } }
							pageInfo { hasNextPage endCursor }
						}
					} }
				}`,
				{ ids },
			);
			const pages = this.collaborators.githubApprovalResponse.histories(
				response,
				batch,
			);
			for (const [index, page] of pages.entries()) {
				if (!page.pageInfo.hasNextPage) {
					histories.push(page.nodes);
					continue;
				}
				if (!page.pageInfo.endCursor)
					throw new Error("Invalid approval history cursor");
				histories.push([
					...page.nodes,
					...(await this.historyPages(batch[index], page.pageInfo.endCursor)),
				]);
			}
		}
		return histories;
	}

	private async historyPages(
		comment: ApprovalComment,
		after: string | undefined,
	): Promise<readonly ApprovalContentEdit[]> {
		if (!comment.node_id)
			throw new Error("Missing approval comment node identity");
		const edits: ApprovalContentEdit[] = [];
		const cursors = new Set<string>();
		if (after) cursors.add(after);
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
			const history = this.collaborators.githubApprovalResponse.history(
				response,
				comment,
			);
			edits.push(...history.nodes);
			if (!history.pageInfo.hasNextPage) return edits;
			const next = history.pageInfo.endCursor;
			if (!next || cursors.has(next))
				throw new Error("Invalid approval history cursor");
			cursors.add(next);
			after = next;
		} while (after);
		return edits;
	}
}
export type GithubApprovalClientArguments =
	ConstructorParameters<typeof GithubApprovalClient> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
