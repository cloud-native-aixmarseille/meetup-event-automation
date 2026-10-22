export class GitHubEventRepositoryScopeError extends Error {
	constructor(expected: string, received: string) {
		super(`GitHub event repository is scoped to ${expected}, not ${received}`);
		this.name = "GitHubEventRepositoryScopeError";
	}
}
