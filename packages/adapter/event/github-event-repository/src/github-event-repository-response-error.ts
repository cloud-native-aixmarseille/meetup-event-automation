export class GitHubEventRepositoryResponseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GitHubEventRepositoryResponseError";
	}
}
