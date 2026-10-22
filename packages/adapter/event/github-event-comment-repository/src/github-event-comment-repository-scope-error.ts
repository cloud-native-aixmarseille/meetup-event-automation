export class GitHubEventCommentRepositoryScopeError extends Error {
	constructor(expected: string, received: string) {
		super(
			`GitHub event comment repository is scoped to ${expected}, not ${received}`,
		);
		this.name = "GitHubEventCommentRepositoryScopeError";
	}
}
