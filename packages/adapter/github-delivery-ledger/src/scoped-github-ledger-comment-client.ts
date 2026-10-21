import type {
	GithubLedgerComment,
	GithubLedgerCommentClient,
} from "./comment-client.js";

interface ScopedGithubLedgerApi {
	readonly rest: {
		readonly issues: {
			listComments(parameters: {
				owner: string;
				repo: string;
				issue_number: number;
				page: number;
				per_page: number;
			}): Promise<{
				data: readonly {
					id: number;
					body?: string | null;
					user?: { login: string } | null;
				}[];
				headers: { link?: string };
			}>;
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

export class ScopedGithubLedgerCommentClient
	implements GithubLedgerCommentClient
{
	constructor(
		private readonly client: ScopedGithubLedgerApi,
		private readonly owner: string,
		private readonly repo: string,
		private readonly issueNumber: number,
	) {}

	async listComments(): Promise<readonly GithubLedgerComment[]> {
		const comments: GithubLedgerComment[] = [];
		for (let page = 1; page <= 100; page++) {
			const response = await this.client.rest.issues.listComments({
				owner: this.owner,
				repo: this.repo,
				issue_number: this.issueNumber,
				page,
				per_page: 100,
			});
			if (!Array.isArray(response.data)) {
				throw new Error("GitHub delivery ledger comment response is invalid");
			}
			ScopedGithubLedgerCommentClient.appendComments(response.data, comments);

			const link = response.headers.link;
			const hasNext =
				typeof link === "string"
					? /<[^>]+>;\s*rel="next"/.test(link)
					: response.data.length === 100;
			if (!hasNext) {
				return comments;
			}
		}
		throw new Error("GitHub delivery ledger pagination exceeded its bound");
	}

	async createComment(body: string): Promise<void> {
		await this.client.rest.issues.createComment({
			owner: this.owner,
			repo: this.repo,
			issue_number: this.issueNumber,
			body,
		});
	}

	async updateComment(commentId: number, body: string): Promise<void> {
		await this.client.rest.issues.updateComment({
			owner: this.owner,
			repo: this.repo,
			comment_id: commentId,
			body,
		});
	}

	private static appendComments(
		values: readonly unknown[],
		comments: GithubLedgerComment[],
	) {
		for (const value of values) {
			if (
				!ScopedGithubLedgerCommentClient.object(value) ||
				typeof value.id !== "number" ||
				!Number.isSafeInteger(value.id) ||
				value.id <= 0 ||
				(value.body != null && typeof value.body !== "string")
			)
				throw new Error("GitHub delivery ledger comment response is invalid");
			const author = value.user;
			if (
				author != null &&
				(!ScopedGithubLedgerCommentClient.object(author) ||
					typeof author.login !== "string")
			)
				throw new Error("GitHub delivery ledger comment author is invalid");
			if (typeof value.body === "string") {
				comments.push({
					id: value.id,
					body: value.body,
					...(ScopedGithubLedgerCommentClient.object(author) &&
					typeof author.login === "string"
						? { authorLogin: author.login }
						: {}),
				});
			}
		}
	}

	private static object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
