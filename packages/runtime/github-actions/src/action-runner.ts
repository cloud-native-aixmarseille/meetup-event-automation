import * as core from "@actions/core";
import { ActionOutput } from "./action-output.js";
import { ActionReport, type ActionReportData } from "./action-report.js";
import { ActionMessages } from "./i18n/action-messages.js";
import type { MessageId } from "./i18n/catalog.js";
import { RuntimeInput } from "./runtime-input.js";

export class ActionRunner {
	static async run(
		title: Extract<MessageId, `action.${string}`>,
		operation: (messages: ActionMessages) => Promise<ActionReportData>,
	): Promise<void> {
		const messages = new ActionMessages(core.getInput("locale"));
		let report: ActionReportData;
		try {
			report = await operation(messages);
		} catch (error) {
			const message = RuntimeInput.publicErrorMessage(error);
			report = {
				details: [
					messages.t("report.execution.failed"),
					messages.t("report.execution.guidance"),
				],
				diagnostics: [
					{ code: "action.execution.failed", severity: "error", message },
				],
				failure: messages.error(
					error instanceof Error ? error.name : "",
					message,
				),
			};
		}
		await ActionReport.write(messages.t(title), report, messages);
		if (report.failure) core.setFailed(report.failure);
		ActionOutput.setDiagnosticsOutput(report.diagnostics);
	}
}
