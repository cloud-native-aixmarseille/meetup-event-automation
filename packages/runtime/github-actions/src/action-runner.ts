import * as core from "@actions/core";
import { EventConcurrentModificationError } from "@meetup-automation/event";
import {
	OrganizerCommentChangedError,
	type DiagnosticPolicy,
} from "@meetup-automation/journey";
import type { ActionFailurePresenter } from "./action-failure-presenter.js";
import type { ActionOutput } from "./action-output.js";
import type { ActionReport, ActionReportData } from "./action-report.js";
import type {
	ActionMessages,
	ActionMessagesArguments,
} from "./i18n/action-messages.js";
import type { MessageId } from "./i18n/catalog.js";

export interface ActionRunnerCollaborators {
	readonly diagnosticPolicy: Pick<DiagnosticPolicy, "isTechnicalFailure">;
	readonly actionFailurePresenter: Pick<
		ActionFailurePresenter,
		"publicErrorMessage"
	>;
	readonly actionReport: Pick<ActionReport, "write">;
	readonly actionOutput: Pick<ActionOutput, "setDiagnosticsOutput">;
	readonly createActionMessages: (
		...args: ActionMessagesArguments
	) => ActionMessages;
}

export class ActionRunner {
	constructor(private readonly collaborators: ActionRunnerCollaborators) {}

	async run(
		title: Extract<MessageId, `action.${string}`>,
		operation: (messages: ActionMessages) => Promise<ActionReportData>,
		diagnosticsOutput: boolean,
	): Promise<void> {
		let messages = this.collaborators.createActionMessages("en");
		let report: ActionReportData;
		try {
			messages = this.collaborators.createActionMessages(
				core.getInput("locale", { required: true }),
			);
			report = await operation(messages);
			const failures = report.diagnostics
				.filter((item) =>
					this.collaborators.diagnosticPolicy.isTechnicalFailure(item),
				)
				.map((item) => item.code);
			if (!report.failure && failures.length > 0) {
				report = {
					...report,
					failure: messages.t("report.technical-failure", {
						codes: [...new Set(failures)].join(", "),
					}),
				};
			}
		} catch (error) {
			report = this.exceptionReport(error, messages);
		}
		await this.collaborators.actionReport.write(
			messages.t(title),
			report,
			messages,
		);
		if (report.failure) core.setFailed(report.failure);
		if (diagnosticsOutput)
			this.collaborators.actionOutput.setDiagnosticsOutput(report.diagnostics);
	}
	private exceptionReport(
		error: unknown,
		messages: ActionMessages,
	): ActionReportData {
		if (
			error instanceof OrganizerCommentChangedError ||
			error instanceof EventConcurrentModificationError
		) {
			const code =
				error instanceof OrganizerCommentChangedError
					? "action.comment-concurrently-modified"
					: "event.concurrently-modified";
			return {
				details:
					error instanceof OrganizerCommentChangedError
						? [messages.t("report.comment-changed")]
						: [],
				diagnostics: [{ code, severity: "info", message: code }],
			};
		}
		const message =
			this.collaborators.actionFailurePresenter.publicErrorMessage(error);
		return {
			details: [],
			diagnostics: [
				{ code: "action.execution.failed", severity: "error", message },
			],
			failure: messages.error(
				error instanceof Error ? error.name : "",
				message,
			),
		};
	}
}
