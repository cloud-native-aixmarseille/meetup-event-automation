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
		let page = 1;
		while (true) {
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
			page += 1;
		}
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
		values: Awaited<
			ReturnType<ScopedGithubLedgerApi["rest"]["issues"]["listComments"]>
		>["data"],
		comments: GithubLedgerComment[],
	) {
		for (const value of values) {
			if (Number.isSafeInteger(value.id) && typeof value.body === "string") {
				comments.push({
					id: value.id,
					body: value.body,
					...(value.user?.login ? { authorLogin: value.user.login } : {}),
				});
			}
		}
	}
}
