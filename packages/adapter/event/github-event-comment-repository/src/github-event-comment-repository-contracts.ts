export const EVENT_DIAGNOSTIC_COMMENT_MARKER =
	"<!-- meetup-automation:event-diagnostics:v1 -->";

export const DUPLICATE_COMMENT_MARKER =
	"<!-- meetup-automation:event-diagnostics-duplicate:v1 -->";
export const COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER =
	"<!-- meetup-automation:communication-diagnostics:v1 -->";

type GitHubRequestResult = Readonly<{
	data: unknown;
	headers?: Readonly<Record<string, unknown>>;
}>;

/** Minimal structural client contract; comment SDK DTOs stay inside the adapter. */
export interface GitHubEventCommentRepositoryClient {
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
			deleteComment?(parameters: {
				owner: string;
				repo: string;
				comment_id: number;
			}): Promise<unknown>;
		};
	};
	readonly minimizeComment?: (parameters: {
		commentId: number;
		classifier: "OUTDATED";
	}) => Promise<unknown>;
}

export type GitHubEventCommentRepositoryOptions = Readonly<{
	owner: string;
	repo: string;
	/** Only this configured GitHub App bot can own managed comments. */
	authorLogin: string;
	locale?: string;
	/** Retire separate stage reports only after their merged checklist is saved. */
	retireCommunicationReports?: boolean;
	retainedContent?: {
		load(
			issueNumber: number,
			commentId: number,
			body: string,
		): Promise<{
			readonly body: string;
			readonly retained: string;
		}>;
	};
}>;

export type ManagedComment = Readonly<{
	id: number;
	body: string;
	authorLogin?: string;
	authorType?: string;
}>;
