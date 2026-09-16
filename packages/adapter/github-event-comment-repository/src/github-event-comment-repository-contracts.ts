export const EVENT_DIAGNOSTIC_COMMENT_MARKER =
	"<!-- meetup-automation:event-diagnostics:v1 -->";

const DUPLICATE_COMMENT_MARKER =
	"<!-- meetup-automation:event-diagnostics-duplicate:v1 -->";

export const RESOLVED_COMMENT_BODY = `${EVENT_DIAGNOSTIC_COMMENT_MARKER}\n\nAll previously reported issues have been resolved. No changes are currently needed.`;

export const DUPLICATE_COMMENT_BODY = `${DUPLICATE_COMMENT_MARKER}\n\nSuperseded duplicate automation comment.`;

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
	/** Restrict managed comments to this bot login when it is known. */
	authorLogin?: string;
}>;

export type ManagedComment = Readonly<{
	id: number;
	body: string;
	authorLogin?: string;
}>;
