export class GithubCommunicationApprovalRepositoryStateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GithubCommunicationApprovalRepositoryStateError";
	}
}
