import * as core from "@actions/core";
import type { PublicDiagnostic } from "@meetup-automation/journey";
import type { ActionMessages } from "./i18n/action-messages.js";

/** Only explicitly selected public facts and redacted diagnostics belong here. */
export interface ActionReportData {
	readonly details: readonly string[];
	readonly diagnostics: readonly PublicDiagnostic[];
	/** Explicit technical failure; the runner also classifies diagnostic codes. */
	readonly failure?: string;
}

export class ActionReport {
	async write(
		title: string,
		report: ActionReportData,
		messages: ActionMessages,
	): Promise<void> {
		const lines = new Set(report.details);
		for (const item of report.diagnostics) {
			lines.add(this.diagnosticMessage(item));
		}
		if (report.failure)
			lines.add(messages.t("report.failed", { reason: report.failure }));
		for (const line of lines) {
			// Keep multiline values from injecting workflow commands into plain logs.
			core.info(line.replaceAll("\r", "\\r").replaceAll("\n", "\\n"));
		}
		const content = [...lines]
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
	private diagnosticMessage(item: PublicDiagnostic): string {
		const field = item.field ? ` field=${item.field}` : "";
		const fixed =
			item.fixApplied === undefined ? "" : ` fix_applied=${item.fixApplied}`;
		return `${item.severity} ${item.code}${field}${fixed}`;
	}
}
