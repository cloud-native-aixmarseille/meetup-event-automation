import { OrganizerCommentChangedError } from "@meetup-automation/journey";
export interface GitHubCommentVisibilityApi {
	graphql<Response>(
		query: string,
		variables: { id: string },
	): Promise<Response>;
	readonly rest: {
		readonly issues: {
			getComment(input: {
				owner: string;
				repo: string;
				comment_id: number;
			}): Promise<{ data: { node_id: string; body?: string | null } }>;
		};
	};
}

/** Collapse verified bot content without deleting its durable state or history. */
export class GitHubCommentVisibility {
	constructor(
		private readonly api: GitHubCommentVisibilityApi,
		private readonly owner: string,
		private readonly repo: string,
	) {}

	async synchronize(
		commentId: number,
		expectedBody: string,
		resolved: boolean,
	): Promise<void> {
		const { data } = await this.api.rest.issues.getComment({
			owner: this.owner,
			repo: this.repo,
			comment_id: commentId,
		});
		if (!data.node_id || typeof data.body !== "string")
			throw new Error("Invalid comment visibility response");
		if (data.body !== expectedBody) throw new OrganizerCommentChangedError();
		const response = await this.api.graphql<unknown>(
			`query CommentVisibility($id: ID!) {
				node(id: $id) { ... on IssueComment { id body isMinimized minimizedReason } }
			}`,
			{ id: data.node_id },
		);
		if (!this.object(response) || !this.object(response.node))
			throw new Error("Invalid comment visibility response");
		const comment = response.node;
		if (
			comment.id !== data.node_id ||
			typeof comment.body !== "string" ||
			typeof comment.isMinimized !== "boolean"
		)
			throw new Error("Invalid comment visibility response");
		if (comment.body !== expectedBody) throw new OrganizerCommentChangedError();
		if (resolved === comment.isMinimized) return;
		if (!resolved && comment.minimizedReason !== "resolved") return;
		await this.change(data.node_id, resolved);
	}

	private async change(id: string, resolved: boolean): Promise<void> {
		const mutation = resolved
			? `mutation ResolveComment($id: ID!) {
				minimizeComment(input: { subjectId: $id, classifier: RESOLVED }) {
					minimizedComment { isMinimized }
				}
			}`
			: `mutation ReopenComment($id: ID!) {
				unminimizeComment(input: { subjectId: $id }) {
					unminimizedComment { isMinimized }
				}
			}`;
		const response = await this.api.graphql<unknown>(mutation, { id });
		const result = this.object(response)
			? response[resolved ? "minimizeComment" : "unminimizeComment"]
			: undefined;
		const comment = this.object(result)
			? result[resolved ? "minimizedComment" : "unminimizedComment"]
			: undefined;
		if (!this.object(comment) || comment.isMinimized !== resolved)
			throw new Error("Comment visibility update was not confirmed");
	}

	private object(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
}
