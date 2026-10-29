import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ReconcileMeetupRegistrations } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { EventDocumentCompositionInput } from "./composition.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { RuntimeInput } from "./runtime-input.js";

export type RegistrationCompositionInput = EventDocumentCompositionInput & {
	url: string;
	firstDataRow: number;
	lastDataRow: number;
	credentials: string;
};

export class RegistrationAction {
	constructor(
		private readonly dependencies: {
			runtime: Pick<RuntimeInput, "positiveIntegerInput">;
			create: (
				input: RegistrationCompositionInput,
			) => Pick<ReconcileMeetupRegistrations, "execute">;
		},
	) {}

	async run(messages: ActionMessages): Promise<ActionReportData> {
		const issueNumber = this.integer("issue-number");
		const firstDataRow = this.integer("first-data-row");
		const lastDataRow = this.integer("last-data-row");
		const url = core.getInput("registrations-sheet-url", { required: true });
		const emailColumn = core.getInput("email-column", { required: true });
		const credentials = core.getInput("google-credentials", { required: true });
		core.setSecret(credentials);
		const journey = this.dependencies.create({
			...context.repo,
			locale: messages.locale,
			client: getOctokit(core.getInput("github-token", { required: true })),
			url,
			firstDataRow,
			lastDataRow,
			credentials,
		});
		const result = await journey.execute(
			{ repository: `${context.repo.owner}/${context.repo.repo}`, issueNumber },
			{ emailColumn },
		);
		return {
			details: [
				messages.t("report.registration.counts", {
					status: result.status,
					responses: result.responseCount,
					participants: result.participantCount,
					duplicates: result.duplicateCount,
					invalid: result.invalidCount,
				}),
				messages.t(`report.registration.${result.status}`),
			],
			diagnostics: result.diagnostics,
		};
	}

	private integer(name: string): number {
		return this.dependencies.runtime.positiveIntegerInput(
			name,
			core.getInput(name, { required: true }),
		);
	}
}
