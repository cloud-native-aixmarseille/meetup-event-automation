import * as core from "@actions/core";
import { context } from "@actions/github";
import type { CommunicationDiagnosticProjection } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { CommunicationRuntime } from "./communication.js";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { RuntimeInput } from "./runtime-input.js";

export interface CommunicationActionCollaborators {
	readonly runtimeInput: Pick<
		RuntimeInput,
		"positiveIntegerInput" | "booleanInput"
	>;
	readonly communicationRuntime: Pick<
		CommunicationRuntime,
		"runCommunicationReconcile"
	>;
	readonly conferenceHallInput: Pick<ConferenceHallInput, "read">;
	readonly communicationDiagnosticProjection: Pick<
		CommunicationDiagnosticProjection,
		"domainDiagnostic" | "runtimeDiagnostic"
	>;
}

export class CommunicationAction {
	constructor(
		private readonly collaborators: CommunicationActionCollaborators,
	) {}

	async runCommunicationReconcileAction(
		messages: ActionMessages,
	): Promise<ActionReportData> {
		const issueNumber = this.collaborators.runtimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const slidesReady = this.collaborators.runtimeInput.booleanInput(
			"slides-ready",
			core.getInput("slides-ready", { required: true }),
		);
		const { owner, repo } = context.repo;
		const outcome =
			await this.collaborators.communicationRuntime.runCommunicationReconcile({
				locale: messages.locale,
				...this.collaborators.conferenceHallInput.read(),
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
		return this.report(outcome, messages);
	}

	private report(
		outcome: Awaited<
			ReturnType<CommunicationRuntime["runCommunicationReconcile"]>
		>,
		messages: ActionMessages,
	): ActionReportData {
		const diagnostics = [
			...outcome.diagnostics.map(
				this.collaborators.communicationDiagnosticProjection.domainDiagnostic.bind(
					this.collaborators.communicationDiagnosticProjection,
				),
			),
			...outcome.runtimeDiagnostics.map(
				this.collaborators.communicationDiagnosticProjection.runtimeDiagnostic.bind(
					this.collaborators.communicationDiagnosticProjection,
				),
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
