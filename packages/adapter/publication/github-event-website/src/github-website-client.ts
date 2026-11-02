export interface GithubWebsiteClient {
	rest: {
		repos: {
			getContent(input: {
				owner: string;
				repo: string;
				path: string;
			}): Promise<{ data: unknown }>;
			createOrUpdateFileContents(input: {
				owner: string;
				repo: string;
				path: string;
				message: string;
				content: string;
				sha: string;
			}): Promise<unknown>;
		};
	};
}

export type GithubWebsiteTarget = Readonly<{
	owner: string;
	repo: string;
	path: string;
}>;
