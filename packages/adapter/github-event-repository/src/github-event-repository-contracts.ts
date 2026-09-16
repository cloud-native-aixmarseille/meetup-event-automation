type GitHubRequestResult = Readonly<{
	data: unknown;
	headers?: Readonly<Record<string, unknown>>;
}>;

/** Minimal structural client contract; no GitHub SDK DTO crosses the adapter. */
export interface GitHubEventRepositoryClient {
	readonly rest: {
		readonly issues: {
			get(parameters: {
				owner: string;
				repo: string;
				issue_number: number;
			}): Promise<GitHubRequestResult>;
			update(parameters: {
				owner: string;
				repo: string;
				issue_number: number;
				title?: string;
				body?: string;
				labels?: string[];
			}): Promise<unknown>;
			listForRepo(parameters: {
				owner: string;
				repo: string;
				state: "open" | "all";
				labels?: string;
				page: number;
				per_page: number;
			}): Promise<GitHubRequestResult>;
		};
	};
}

export type GitHubEventRepositoryOptions = Readonly<{
	owner: string;
	repo: string;
}>;
