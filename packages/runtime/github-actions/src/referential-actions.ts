import * as core from "@actions/core";
import type {
	SynchronizeMeetupIssueForm,
	ValidateMeetupReferentials,
} from "@meetup-automation/journey";
import type { Locale } from "@meetup-automation/localization";
import type { ActionReportData } from "./action-report.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { ReferentialActionReport } from "./referential-action-report.js";
import type { RuntimeInput } from "./runtime-input.js";

export interface ReferentialActionsCollaborators {
	readonly validateReferentials: (
		locale: Locale,
	) => Pick<ValidateMeetupReferentials, "execute">;
	readonly synchronizeIssueForm: (
		locale: Locale,
	) => Pick<SynchronizeMeetupIssueForm, "execute">;
	readonly referentialActionReport: Pick<
		ReferentialActionReport,
		"validation" | "issueForm"
	>;
	readonly runtimeInput: Pick<RuntimeInput, "enumInput">;
}

export class ReferentialActions {
	constructor(
		private readonly collaborators: ReferentialActionsCollaborators,
	) {}

	async runReferentialValidateAction(
		messages: ActionMessages,
	): Promise<ActionReportData> {
		const outcome = await this.collaborators
			.validateReferentials(messages.locale)
			.execute();
		const counts = outcome.isValid
			? {
					hostCount: outcome.catalog.hosts.length,
					speakerCount: outcome.catalog.speakers.length,
				}
			: { hostCount: 0, speakerCount: 0 };
		const report = this.collaborators.referentialActionReport.validation(
			{ isValid: outcome.isValid, ...counts },
			outcome.diagnostics,
			messages,
		);

		return report;
	}

	async runReferentialSyncIssueFormAction(
		messages: ActionMessages,
	): Promise<ActionReportData> {
		const mode = this.collaborators.runtimeInput.enumInput(
			"mode",
			core.getInput("mode", { required: true }),
			["check", "fix"] as const,
		);
		const outcome = await this.collaborators
			.synchronizeIssueForm(messages.locale)
			.execute({ mode });
		const report = this.collaborators.referentialActionReport.issueForm(
			mode,
			outcome,
			messages,
		);

		core.setOutput("changed", String(outcome.changed));

		return report;
	}
}
