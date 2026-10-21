import * as core from "@actions/core";
import { EventConcurrentModificationError } from "@meetup-automation/event";
import type { DiagnosticPolicy } from "@meetup-automation/journey";
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
			if (error instanceof EventConcurrentModificationError) {
				report = {
					details: [],
					diagnostics: [
						{
							code: "event.concurrently-modified",
							severity: "info",
							message: "event.concurrently-modified",
						},
					],
				};
			} else {
				const message =
					this.collaborators.actionFailurePresenter.publicErrorMessage(error);
				report = {
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
		await this.collaborators.actionReport.write(
			messages.t(title),
			report,
			messages,
		);
		if (report.failure) core.setFailed(report.failure);
		if (diagnosticsOutput)
			this.collaborators.actionOutput.setDiagnosticsOutput(report.diagnostics);
	}
}
