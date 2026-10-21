import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ManageMeetupAssets } from "@meetup-automation/journey";
import type { ActionOutput } from "./action-output.js";
import type { ActionReportData } from "./action-report.js";
import type { AssetContentConfiguration } from "./assets/asset-content-configuration.js";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { PublicationComposition } from "./publication-composition.js";
import type { PublicationUrlInput } from "./publication-url-input.js";
import type { RuntimeInput } from "./runtime-input.js";

export interface PublicationActionCollaborators {
	readonly publicationUrlInput: Pick<PublicationUrlInput, "read">;
	readonly createJourney: (
		input: Parameters<
			typeof PublicationComposition.createPublicationContainer
		>[0],
	) => Pick<ManageMeetupAssets, "execute">;
	readonly runtimeInput: Pick<RuntimeInput, "positiveIntegerInput">;
	readonly assetContentConfiguration: Pick<AssetContentConfiguration, "load">;
	readonly conferenceHallInput: Pick<ConferenceHallInput, "read">;
	readonly actionOutput: Pick<ActionOutput, "setJsonOutput">;
}

export class PublicationAction {
	constructor(private readonly collaborators: PublicationActionCollaborators) {}

	async runPublicationReconcileAssetsAction(
		messages: ActionMessages,
	): Promise<ActionReportData> {
		const issueNumber = this.collaborators.runtimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const credentials = core.getInput("google-credentials", { required: true });
		core.setSecret(credentials);
		const client = getOctokit(
			core.getInput("github-token", { required: true }),
		);
		const { owner, repo } = context.repo;
		const journey = this.collaborators.createJourney({
			publicationUrls: this.collaborators.publicationUrlInput.read(),
			contentConfiguration:
				await this.collaborators.assetContentConfiguration.load(
					process.cwd(),
					`${owner}/${repo}#${issueNumber}`,
				),
			locale: messages.locale,
			...this.collaborators.conferenceHallInput.read(),
			client,
			owner,
			repo,
			credentials,
			parentFolderId: core.getInput("google-drive-meetup-folder-id", {
				required: true,
			}),
			templateFolderId: core.getInput(
				"google-drive-meetup-template-folder-id",
				{
					required: true,
				},
			),
		});
		const outcome = await journey.execute({
			identity: { repository: `${owner}/${repo}`, issueNumber },
		});
		return this.report(issueNumber, outcome, messages);
	}

	private report(
		issueNumber: number,
		outcome: Awaited<ReturnType<ManageMeetupAssets["execute"]>>,
		messages: ActionMessages,
	): ActionReportData {
		this.collaborators.actionOutput.setJsonOutput("drive-files", outcome.files);
		core.setOutput("slides-ready", outcome.slidesReady);

		return {
			details: [
				messages.t("report.event.context", { issue: issueNumber, mode: "fix" }),
				outcome.skipped
					? messages.t("report.assets.skipped")
					: messages.t("report.assets.completed"),
				messages.t("report.assets.counts", {
					persisted: String(outcome.persisted),
					count: Object.keys(outcome.files).length,
				}),
			],
			diagnostics: outcome.diagnostics,
		};
	}
}
