import * as core from "@actions/core";
import { EventConcurrentModificationError } from "@meetup-automation/event";
import { DiagnosticPolicy } from "@meetup-automation/journey";
import { ActionFailurePresenter } from "./action-failure-presenter.js";
import { ActionOutput } from "./action-output.js";
import { ActionReport, type ActionReportData } from "./action-report.js";
import { ActionMessages } from "./i18n/action-messages.js";
import type { MessageId } from "./i18n/catalog.js";

export class ActionRunner {
	static async run(
		title: Extract<MessageId, `action.${string}`>,
		operation: (messages: ActionMessages) => Promise<ActionReportData>,
		diagnosticsOutput: boolean,
	): Promise<void> {
		let messages = new ActionMessages("en");
		let report: ActionReportData;
		try {
			messages = new ActionMessages(
				core.getInput("locale", { required: true }),
			);
			report = await operation(messages);
			const failures = report.diagnostics
				.filter((item) => DiagnosticPolicy.isTechnicalFailure(item))
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
				const message = ActionFailurePresenter.publicErrorMessage(error);
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
		await ActionReport.write(messages.t(title), report, messages);
		if (report.failure) core.setFailed(report.failure);
		if (diagnosticsOutput)
			ActionOutput.setDiagnosticsOutput(report.diagnostics);
	}
}
