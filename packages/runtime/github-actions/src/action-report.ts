import * as core from "@actions/core";
import type { PublicDiagnostic } from "@meetup-automation/journey";
import { ActionMessages } from "./i18n/action-messages.js";

/** Only explicitly selected public facts and redacted diagnostics belong here. */
export interface ActionReportData {
	readonly details: readonly string[];
	readonly diagnostics: readonly PublicDiagnostic[];
	/** Failure policy belongs to the action; diagnostics alone do not fail a run. */
	readonly failure?: string;
}

export class ActionReport {
	static async write(
		title: string,
		report: ActionReportData,
		messages = new ActionMessages(),
	): Promise<void> {
		const lines = [...report.details];
		core.info(title);
		for (const detail of report.details) {
			// Keep multiline values from injecting workflow commands into plain logs.
			core.info(detail.replaceAll("\r", "\\r").replaceAll("\n", "\\n"));
		}
		for (const item of report.diagnostics) {
			const message = ActionReport.diagnosticMessage(
				item,
				report.failure,
				messages,
			);
			if (item.severity === "error") core.error(message);
			else if (item.severity === "warning") core.warning(message);
			else core.notice(message);
			lines.push(
				`${messages.t(`report.severity.${item.severity}`)}: ${message}`,
			);
		}
		if (report.diagnostics.length === 0) {
			core.info(messages.t("report.no-diagnostics"));
			lines.push(messages.t("report.no-diagnostics"));
		}
		if (report.failure)
			lines.push(messages.t("report.failed", { reason: report.failure }));
		const content = lines
			.join("\n")
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;");
		try {
			await core.summary
				.addHeading(title, 2)
				.addRaw(`<pre>${content}</pre>\n`)
				.write();
		} catch {
			core.summary.clear();
			core.warning(messages.t("report.summary-unavailable"));
		}
	}
	private static diagnosticMessage(
		item: PublicDiagnostic,
		failure: string | undefined,
		messages: ActionMessages,
	): string {
		const field = item.field ? ` (${item.field})` : "";
		const fixed =
			item.fixApplied === undefined
				? ""
				: ` [${messages.t("report.fix-applied", { applied: String(item.fixApplied) })}]`;
		const translated =
			item.code === "action.execution.failed" && failure
				? failure
				: messages.diagnostic(item.code, item.message);
		return `[${item.code}]${field}: ${translated}${fixed}`;
	}
}
