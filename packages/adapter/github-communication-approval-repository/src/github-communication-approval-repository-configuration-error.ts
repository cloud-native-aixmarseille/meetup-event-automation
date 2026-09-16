export class GithubCommunicationApprovalRepositoryConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GithubCommunicationApprovalRepositoryConfigurationError";
	}
}
