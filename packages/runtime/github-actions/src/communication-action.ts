import * as core from "@actions/core";
import { context } from "@actions/github";
import { CommunicationDiagnosticProjection } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import { CommunicationRuntime } from "./communication.js";
import { ConferenceHallInput } from "./conference-hall-input.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { RuntimeInput } from "./runtime-input.js";

export class CommunicationAction {
	static async runCommunicationReconcileAction(
		messages = new ActionMessages(),
	): Promise<ActionReportData> {
		const issueNumber = RuntimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const slidesReady = RuntimeInput.booleanInput(
			"slides-ready",
			core.getInput("slides-ready", { required: true }),
		);
		const { owner, repo } = context.repo;
		const outcome = await CommunicationRuntime.runCommunicationReconcile({
			locale: messages.locale,
			...ConferenceHallInput.read(),
			issueNumber,
			slidesUrl: slidesReady
				? core.getInput("slides-url", { required: true })
				: undefined,
			slidesReady,
			openFeedbackApiKey: core.getInput("openfeedback-api-key", {
				required: true,
			}),

			githubToken: core.getInput("github-token", { required: true }),
			mailingsToken: core.getInput("mailings-token", { required: true }),
			slackToken: core.getInput("slack-token", { required: true }),
			slackOrganizerChannelId: core.getInput("slack-organizer-channel-id", {
				required: true,
			}),
			owner,
			repo,
			repositoryId: process.env.GITHUB_REPOSITORY_ID,
			managedCommentAuthor: core.getInput("managed-comment-author", {
				required: true,
			}),
		});
		return CommunicationAction.report(outcome, messages);
	}

	private static report(
		outcome: Awaited<
			ReturnType<typeof CommunicationRuntime.runCommunicationReconcile>
		>,
		messages: ActionMessages,
	): ActionReportData {
		const diagnostics = [
			...outcome.diagnostics.map(
				CommunicationDiagnosticProjection.domainDiagnostic,
			),
			...outcome.runtimeDiagnostics.map(
				CommunicationDiagnosticProjection.runtimeDiagnostic,
			),
		];

		return {
			details: [
				messages.t("report.communication.mode", { mode: outcome.mode }),
				messages.t("report.communication.planned", outcome.counts),
				messages.t("report.communication.accepted", {
					...outcome.counts,
					recorded: outcome.counts.alreadyRecorded,
				}),
				messages.t("report.communication.uncertain", outcome.counts),
			],
			diagnostics,
		};
	}
}
