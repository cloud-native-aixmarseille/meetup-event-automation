export interface GithubBudgetCommentsApi {
	readonly rest: {
		readonly issues: {
			listCommentsForRepo(input: {
				owner: string;
				repo: string;
				since: string;
				sort: "updated";
				direction: "asc";
				per_page: number;
				page: number;
			}): Promise<{
				data: readonly {
					issue_url: string;
					user?: { login: string; type?: string } | null;
				}[];
				headers: { link?: string };
			}>;
		};
	};
}
/** Find issues with recent bot activity, including closed issues and edited comments. */
export class GithubAttentionBudgetSource {
	constructor(
		private readonly client: GithubBudgetCommentsApi,
		private readonly owner: string,
		private readonly repo: string,
		private readonly author: string,
	) {}
	async issues(day: number): Promise<readonly number[]> {
		const issues = new Set<number>();
		// One extra UTC date covers the Paris offset and both DST transitions.
		const since = new Date((day - 7) * 86_400_000).toISOString();
		for (let page = 1; ; page++) {
			const response = await this.client.rest.issues.listCommentsForRepo({
				owner: this.owner,
				repo: this.repo,
				since,
				sort: "updated",
				direction: "asc",
				per_page: 100,
				page,
			});
			for (const comment of response.data) {
				if (
					comment.user?.type !== "Bot" ||
					comment.user.login.toLowerCase() !== this.author.toLowerCase()
				)
					continue;
				issues.add(this.issue(comment.issue_url));
			}
			if (!response.headers.link?.includes('rel="next"')) return [...issues];
		}
	}
	private issue(url: string): number {
		const prefix = `https://api.github.com/repos/${this.owner}/${this.repo}/issues/`;
		const number = url.startsWith(prefix) ? url.slice(prefix.length) : "";
		if (!/^[1-9]\d*$/.test(number) || !Number.isSafeInteger(Number(number)))
			throw new Error("Invalid attention budget issue identity");
		return Number(number);
	}
}
