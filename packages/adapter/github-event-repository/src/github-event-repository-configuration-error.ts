export class GitHubEventRepositoryConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GitHubEventRepositoryConfigurationError";
	}
}
