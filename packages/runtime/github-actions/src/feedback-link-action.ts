import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ReconcileFeedbackLink } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { EventDocumentCompositionInput } from "./composition.js";
import type { ActionMessages } from "./i18n/action-messages.js";

export class FeedbackLinkAction {
	constructor(
		private readonly create: (
			input: EventDocumentCompositionInput & {
				apiKey: string;
				baseUrl: string;
				linkId: string;
			},
		) => Pick<ReconcileFeedbackLink, "execute">,
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
		const apiKey = core.getInput("kutt-api-key", { required: true });
		core.setSecret(apiKey);
		const operation = this.create({
			...context.repo,
			locale: messages.locale,
			client: getOctokit(core.getInput("github-token", { required: true })),
			apiKey,
			baseUrl: core.getInput("kutt-base-url", { required: true }),
			linkId: core.getInput("kutt-link-id", { required: true }),
		});
		const result = await operation.execute(
			`${context.repo.owner}/${context.repo.repo}`,
		);
		return {
			details: [
				messages.t("report.feedback.link", { updated: String(result.updated) }),
			],
			diagnostics: result.diagnostics,
		};
	}
}
