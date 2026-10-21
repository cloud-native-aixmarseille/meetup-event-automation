import type {
	IssueFormProjectionMode,
	PublicDiagnostic,
	SynchronizeMeetupIssueFormResult,
} from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { ActionMessages } from "./i18n/action-messages.js";

export class ReferentialActionReport {
	validation(
		result: { isValid: boolean; hostCount: number; speakerCount: number },
		diagnostics: readonly PublicDiagnostic[],
		messages: ActionMessages,
	): ActionReportData {
		const details = [
			messages.t(
				result.isValid
					? "report.referential.valid"
					: "report.referential.invalid",
			),
			messages.t("report.referential.counts", {
				hosts: result.hostCount,
				speakers: result.speakerCount,
			}),
		];
		return {
			details,
			diagnostics,
		};
	}

	issueForm(
		mode: IssueFormProjectionMode,
		result: SynchronizeMeetupIssueFormResult,
		messages: ActionMessages,
	): ActionReportData {
		const details: string[] = [];
		if (result.diagnostics.some((item) => item.severity === "error")) {
			details.push(messages.t("report.issue-form.blocked"));
		} else if (result.changed) {
			details.push(
				mode === "check"
					? messages.t("report.issue-form.stale")
					: messages.t("report.issue-form.updated"),
				messages.t("report.issue-form.files", {
					files: result.changedFiles.join(", "),
				}),
			);
		} else {
			details.push(messages.t("report.issue-form.current"));
		}
		return { details, diagnostics: result.diagnostics };
	}
}
