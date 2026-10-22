import type { ValidateMeetupReferentials } from "@meetup-automation/journey";
import type { Locale } from "@meetup-automation/localization";
import type { ActionReportData } from "./action-report.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { ReferentialActionReport } from "./referential-action-report.js";
export class ReferentialAction {
	constructor(
		private readonly collaborators: {
			readonly validateReferentials: (
				locale: Locale,
			) => Pick<ValidateMeetupReferentials, "execute">;
			readonly referentialActionReport: Pick<
				ReferentialActionReport,
				"validation"
			>;
		},
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
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
}
