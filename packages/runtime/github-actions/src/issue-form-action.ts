import * as core from "@actions/core";
import type { ReconcileMeetupIssueForm } from "@meetup-automation/journey";
import type { Locale } from "@meetup-automation/localization";
import type { ActionReportData } from "./action-report.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { ReferentialActionReport } from "./referential-action-report.js";
import type { RuntimeInput } from "./runtime-input.js";
export class IssueFormAction {
	constructor(
		private readonly collaborators: {
			readonly reconcileIssueForm: (
				locale: Locale,
			) => Pick<ReconcileMeetupIssueForm, "execute">;
			readonly referentialActionReport: Pick<
				ReferentialActionReport,
				"issueForm"
			>;
			readonly runtimeInput: Pick<RuntimeInput, "enumInput">;
		},
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
		const mode = this.collaborators.runtimeInput.enumInput(
			"mode",
			core.getInput("mode", { required: true }),
			["check", "fix"] as const,
		);
		const outcome = await this.collaborators
			.reconcileIssueForm(messages.locale)
			.execute({ mode });
		const report = this.collaborators.referentialActionReport.issueForm(
			mode,
			outcome,
			messages,
		);

		core.setOutput("changed", String(outcome.changed));
		core.setOutput("completed", String(outcome.completed));

		return report;
	}
}
