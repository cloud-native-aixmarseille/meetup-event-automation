import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { ManageMeetupAttention } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import { AttentionComposition } from "./attention-composition.js";
import { AttentionStages } from "./attention-stages.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { RuntimeInput } from "./runtime-input.js";
import { OrganizerFeedback } from "./organizer-feedback.js";
export class AttentionAction {
	static async run(messages = new ActionMessages()): Promise<ActionReportData> {
		const issueNumber = RuntimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const container = AttentionComposition.create({
			...context.repo,
			issueNumber,
			locale: messages.locale,
			client: getOctokit(core.getInput("github-token", { required: true })),
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
			slackToken: core.getInput("slack-token", { required: true }),
			slackOrganizerChannelId: core.getInput("slack-organizer-channel-id", {
				required: true,
			}),
		});
		const identity = {
			repository: `${context.repo.owner}/${context.repo.repo}`,
			issueNumber,
		};
		const stageResults = core.getInput("stage-results", { required: true });
		await container.get(OrganizerFeedback).execute(identity, stageResults);
		const result = await container
			.get(ManageMeetupAttention)
			.execute(
				identity,
				AttentionStages.parse(stageResults),
				String(context.runId),
			);

		return {
			details: [
				messages.t(
					result.skipped
						? "report.attention.skipped"
						: "report.attention.updated",
				),
			],
			diagnostics: [],
			...(result.notificationFailed
				? { failure: messages.t("report.attention.failed") }
				: {}),
		};
	}
}
