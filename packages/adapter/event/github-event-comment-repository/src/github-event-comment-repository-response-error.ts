export class GitHubEventCommentRepositoryResponseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GitHubEventCommentRepositoryResponseError";
	}
}
