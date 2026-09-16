export class GitHubEventCommentRepositoryConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GitHubEventCommentRepositoryConfigurationError";
	}
}
