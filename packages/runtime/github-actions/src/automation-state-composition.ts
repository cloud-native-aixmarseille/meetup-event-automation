import type { getOctokit } from "@actions/github";
import { GithubAutomationStateComposition } from "@meetup-automation/github-automation-state";
import { GithubOrganizerApprovalComposition } from "@meetup-automation/github-organizer-approval";
import { OrganizerApprovalComposition } from "./organizer-approval-composition.js";

export interface AutomationStateInput {
	readonly client: ReturnType<typeof getOctokit>;
	readonly owner: string;
	readonly repo: string;
	readonly issueNumber: number;
	readonly commentAuthorLogin: string;
	readonly locale?: string;
}
export class AutomationStateComposition {
	create(input: AutomationStateInput) {
		const client =
			new GithubOrganizerApprovalComposition().githubApprovalClient(
				input.client,
				input.owner,
				input.repo,
				input.issueNumber,
			);
		return new GithubAutomationStateComposition().create(
			client,
			input.commentAuthorLogin,
			input.locale,
			OrganizerApprovalComposition.visibility(input),
		);
	}
}
