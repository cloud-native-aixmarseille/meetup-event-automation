export const COMMUNICATION_APPROVAL_COMMENT_MARKER =
	"<!-- meetup-automation:communication-approval:v1 -->";

type GitHubRequestResult = Readonly<{
	data: unknown;
	headers?: Readonly<Record<string, unknown>>;
}>;

export interface GithubCommunicationApprovalRepositoryClient {
	readonly rest: {
		readonly issues: {
			listComments(parameters: {
				owner: string;
				repo: string;
				issue_number: number;
				page: number;
				per_page: number;
			}): Promise<GitHubRequestResult>;
			createComment(parameters: {
				owner: string;
				repo: string;
				issue_number: number;
				body: string;
			}): Promise<unknown>;
			updateComment(parameters: {
				owner: string;
				repo: string;
				comment_id: number;
				body: string;
			}): Promise<unknown>;
		};
	};
}

export interface GithubCommunicationApprovalRepositoryOptions {
	readonly owner: string;
	readonly repo: string;
	readonly issueNumber: number;
	readonly trustedAuthorLogin: string;
}

export type ManagedComment = Readonly<{
	id: number;
	body: string;
	authorLogin?: string;
}>;
