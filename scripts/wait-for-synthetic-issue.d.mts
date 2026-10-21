export function waitForSyntheticIssue(options: {
	github: {
		rest: {
			issues: {
				listForRepo(parameters: {
					owner: string;
					repo: string;
					state: "open";
					labels: string;
					page: number;
					per_page: number;
				}): Promise<{
					data: readonly {
						number: number;
						state: string;
						pull_request?: unknown;
					}[];
				}>;
			};
		};
	};
	owner: string;
	repo: string;
	issueNumber: number;
	wait?: (milliseconds: number) => Promise<unknown>;
}): Promise<void>;
