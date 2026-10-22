import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ActionReportData } from "./action-report.js";
import type { EventDocumentCompositionInput } from "./composition.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { OrganizerFeedback } from "./organizer-feedback.js";
import type { RuntimeInput } from "./runtime-input.js";

export class ChecklistAction {
	constructor(
		private readonly dependencies: {
			runtime: Pick<RuntimeInput, "positiveIntegerInput">;
			create: (
				input: EventDocumentCompositionInput,
			) => Pick<OrganizerFeedback, "execute">;
		},
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
		const issueNumber = this.dependencies.runtime.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const feedback = this.dependencies.create({
			...context.repo,
			locale: messages.locale,
			client: getOctokit(core.getInput("github-token", { required: true })),
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
		});
		const result = await feedback.execute(
			{ repository: `${context.repo.owner}/${context.repo.repo}`, issueNumber },
			core.getInput("stage-results", { required: true }),
		);
		return {
			details: [
				messages.t(
					result.updated
						? "report.checklist.updated"
						: "report.checklist.retained",
				),
			],
			diagnostics: [],
		};
	}
}
