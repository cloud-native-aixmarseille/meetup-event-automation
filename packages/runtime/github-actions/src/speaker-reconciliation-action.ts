import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ConferenceHallProposalSource } from "@meetup-automation/conference-hall-proposal-source";
import type { CsvSpeakerCatalogStore } from "@meetup-automation/csv-referential-repository";
import type {
	ReconcileSourceSpeakers,
	ReconcileSourceSpeakersArguments,
} from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { SpeakerSyncFailureReport } from "./speaker-sync-failure-report.js";

export interface SpeakerReconciliationActionCollaborators {
	readonly conferenceHallInput: Pick<ConferenceHallInput, "read">;
	readonly speakerSyncFailureReport: Pick<SpeakerSyncFailureReport, "create">;

	readonly createReconcileSourceSpeakers: (
		...args: ReconcileSourceSpeakersArguments
	) => Pick<ReconcileSourceSpeakers, "execute">;
	readonly createConferenceHallProposalSource: (
		event: string,
		apiKey: string,
	) => ConferenceHallProposalSource;
	readonly createCsvSpeakerCatalogStore: (
		root: string,
	) => CsvSpeakerCatalogStore;
}

export class SpeakerReconciliationAction {
	constructor(
		private readonly collaborators: SpeakerReconciliationActionCollaborators,
	) {}

	async run(messages: ActionMessages): Promise<ActionReportData> {
		const client = getOctokit(
			core.getInput("github-token", { required: true }),
		);
		const repository = await client.rest.repos.get(context.repo);
		if (repository.data.private !== true)
			return {
				details: [],
				diagnostics: [],
				failure: messages.t("report.speaker-sync.private"),
			};
		const input = this.collaborators.conferenceHallInput.read();
		try {
			const result = await this.collaborators
				.createReconcileSourceSpeakers(
					this.collaborators.createConferenceHallProposalSource(
						input.conferenceHallEvent,
						input.conferenceHallApiKey,
					),
					this.collaborators.createCsvSpeakerCatalogStore(process.cwd()),
				)
				.execute();
			core.setOutput("pr-title", messages.t("report.speaker-sync.pr-title"));
			core.setOutput("pr-body", messages.t("report.speaker-sync.pr-body"));

			return {
				details: [
					messages.t("report.speaker-sync.completed", {
						count: result.speakerCount,
					}),
				],
				diagnostics: [],
			};
		} catch (error) {
			const { report, prBody } =
				this.collaborators.speakerSyncFailureReport.create(error, messages);
			core.setOutput("pr-body", prBody);
			return report;
		}
	}
}
