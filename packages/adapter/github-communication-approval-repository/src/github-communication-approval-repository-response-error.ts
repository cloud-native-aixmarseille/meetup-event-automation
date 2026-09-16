export class GithubCommunicationApprovalRepositoryResponseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GithubCommunicationApprovalRepositoryResponseError";
	}
}
