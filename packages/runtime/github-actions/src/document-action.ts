import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ReconcileMeetupDocuments } from "@meetup-automation/journey";
import type { ActionOutput } from "./action-output.js";
import type { ActionReportData } from "./action-report.js";
import type { AssetRecoveryInput } from "./assets/asset-recovery-input.js";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type { DocumentComposition } from "./document-composition.js";
import type { EventPublicationConfiguration } from "./event-publication-configuration.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { PublicationUrlInput } from "./publication-url-input.js";
import type { RuntimeInput } from "./runtime-input.js";

export interface DocumentActionCollaborators {
	readonly publicationUrlInput: Pick<
		PublicationUrlInput,
		| "readMeetupEventUrlPrefix"
		| "readCommunityEventUrlPrefixes"
		| "readAssetFolderUrlPrefix"
	>;
	readonly createJourney: (
		input: Parameters<typeof DocumentComposition.createDocumentContainer>[0],
	) => Pick<ReconcileMeetupDocuments, "execute">;
	readonly runtimeInput: Pick<RuntimeInput, "positiveIntegerInput">;
	readonly assetRecoveryInput: Pick<AssetRecoveryInput, "load">;
	readonly publicationConfiguration: Pick<EventPublicationConfiguration, "load">;
	readonly conferenceHallInput: Pick<ConferenceHallInput, "read">;
	readonly actionOutput: Pick<ActionOutput, "setJsonOutput">;
}

export class DocumentAction {
	constructor(private readonly collaborators: DocumentActionCollaborators) {}

	async run(messages: ActionMessages): Promise<ActionReportData> {
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
			meetupEventUrlPrefix:
				this.collaborators.publicationUrlInput.readMeetupEventUrlPrefix(),
			communityEventUrlPrefixes:
				this.collaborators.publicationUrlInput.readCommunityEventUrlPrefixes(),
			assetFolderUrlPrefix:
				this.collaborators.publicationUrlInput.readAssetFolderUrlPrefix(),
			recovery: await this.collaborators.assetRecoveryInput.load(
				process.cwd(),
				`${owner}/${repo}#${issueNumber}`,
			),
			locale: messages.locale,
			startTime: (
				await this.collaborators.publicationConfiguration.load(process.cwd())
			).schedule.startTime,
			issueNumber,
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
			...this.collaborators.conferenceHallInput.read(),
			client,
			owner,
			repo,
			credentials,
			parentFolderId: core.getInput("google-drive-folder-id", {
				required: true,
			}),
			templateFolderId: core.getInput("google-drive-template-folder-id", {
				required: true,
			}),
		});
		const outcome = await journey.execute({
			identity: { repository: `${owner}/${repo}`, issueNumber },
		});
		return this.report(issueNumber, outcome, messages, [
			core.getInput("google-drive-folder-id", { required: true }),
			core.getInput("google-drive-template-folder-id", { required: true }),
		]);
	}

	private report(
		issueNumber: number,
		outcome: Awaited<ReturnType<ReconcileMeetupDocuments["execute"]>>,
		messages: ActionMessages,
		protectedFolderIds: readonly string[],
	): ActionReportData {
		this.collaborators.actionOutput.setJsonOutput("drive-files", outcome.files);
		core.setOutput("slides-ready", outcome.slidesReady);
		this.collaborators.actionOutput.setJsonOutput(
			"pdf-source",
			outcome.pdfSource.revision
				? { ...outcome.pdfSource, protectedFolderIds }
				: {},
		);

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
