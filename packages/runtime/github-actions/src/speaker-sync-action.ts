import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type {
	ConferenceHallProposalSource,
	ConferenceHallProposalSourceArguments,
} from "@meetup-automation/conference-hall-proposal-source";
import type {
	CsvSpeakerCatalogStore,
	CsvSpeakerCatalogStoreArguments,
} from "@meetup-automation/csv-referential-repository";
import type {
	AutomationConfigFactory,
	SynchronizeSourceSpeakers,
	SynchronizeSourceSpeakersArguments,
} from "@meetup-automation/journey";
import type {
	YamlIssueFormProjection,
	YamlIssueFormProjectionArguments,
} from "@meetup-automation/yaml-issue-form-projection";
import type { ActionReportData } from "./action-report.js";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type {
	ActionMessages,
	ActionMessagesArguments,
} from "./i18n/action-messages.js";
import type { SpeakerSyncFailureReport } from "./speaker-sync-failure-report.js";

export interface SpeakerSyncActionCollaborators {
	readonly conferenceHallInput: Pick<ConferenceHallInput, "read">;
	readonly automationConfigFactory: Pick<
		AutomationConfigFactory,
		"createAutomationConfig"
	>;
	readonly speakerSyncFailureReport: Pick<SpeakerSyncFailureReport, "create">;
	readonly createActionMessages: (
		...args: ActionMessagesArguments
	) => ActionMessages;
	readonly createSynchronizeSourceSpeakers: (
		...args: SynchronizeSourceSpeakersArguments
	) => Pick<SynchronizeSourceSpeakers, "execute">;
	readonly createConferenceHallProposalSource: (
		...args: ConferenceHallProposalSourceArguments
	) => ConferenceHallProposalSource;
	readonly createCsvSpeakerCatalogStore: (
		...args: CsvSpeakerCatalogStoreArguments
	) => CsvSpeakerCatalogStore;
	readonly createYamlIssueFormProjection: (
		...args: YamlIssueFormProjectionArguments
	) => YamlIssueFormProjection;
}

export class SpeakerSyncAction {
	constructor(private readonly collaborators: SpeakerSyncActionCollaborators) {}

	async run(
		messages = this.collaborators.createActionMessages(),
	): Promise<ActionReportData> {
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
				.createSynchronizeSourceSpeakers(
					this.collaborators.createConferenceHallProposalSource(
						input.conferenceHallEvent,
						input.conferenceHallApiKey,
					),
					this.collaborators.createCsvSpeakerCatalogStore(process.cwd()),
					this.collaborators.createYamlIssueFormProjection({
						workspaceRoot: process.cwd(),
						locale: messages.locale,
					}),
					this.collaborators.automationConfigFactory.createAutomationConfig(
						context.repo.owner,
					).event,
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
