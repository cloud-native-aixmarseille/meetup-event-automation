import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { ConferenceHallProposalSource } from "@meetup-automation/conference-hall-proposal-source";
import { CsvSpeakerCatalogStore } from "@meetup-automation/csv-referential-repository";
import { SynchronizeSourceSpeakers } from "@meetup-automation/journey";
import { YamlIssueFormProjection } from "@meetup-automation/yaml-issue-form-projection";
import type { ActionReportData } from "./action-report.js";
import { ConferenceHallInput } from "./conference-hall-input.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { SpeakerSyncFailureReport } from "./speaker-sync-failure-report.js";

export class SpeakerSyncAction {
	static async run(messages = new ActionMessages()): Promise<ActionReportData> {
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
		const input = ConferenceHallInput.read();
		try {
			const result = await new SynchronizeSourceSpeakers(
				new ConferenceHallProposalSource(
					input.conferenceHallEvent,
					input.conferenceHallApiKey,
				),
				new CsvSpeakerCatalogStore(process.cwd()),
				new YamlIssueFormProjection({
					workspaceRoot: process.cwd(),
					locale: messages.locale,
				}),
			).execute();
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
			const report = SpeakerSyncFailureReport.create(error, messages);
			core.setOutput("pr-body", report.failure);
			return report;
		}
	}
}
