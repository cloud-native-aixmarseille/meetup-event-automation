import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ManageMeetupAttention } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { AttentionComposition } from "./attention-composition.js";
import type { AttentionStages } from "./attention-stages.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { PublicationUrlInput } from "./publication-url-input.js";
import type { RuntimeInput } from "./runtime-input.js";
export interface AttentionActionCollaborators {
	readonly publicationUrlInput: Pick<
		PublicationUrlInput,
		| "readMeetupEventUrlPrefix"
		| "readCommunityEventUrlPrefixes"
		| "readAssetFolderUrlPrefix"
	>;
	readonly createAttention: (
		input: Parameters<typeof AttentionComposition.create>[0],
	) => Pick<ManageMeetupAttention, "execute">;
	readonly runtimeInput: Pick<RuntimeInput, "positiveIntegerInput">;
	readonly attentionStages: Pick<AttentionStages, "parse">;
}

export class AttentionAction {
	constructor(private readonly collaborators: AttentionActionCollaborators) {}

	async run(messages: ActionMessages): Promise<ActionReportData> {
		const issueNumber = this.collaborators.runtimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const journey = this.collaborators.createAttention({
			meetupEventUrlPrefix:
				this.collaborators.publicationUrlInput.readMeetupEventUrlPrefix(),
			communityEventUrlPrefixes:
				this.collaborators.publicationUrlInput.readCommunityEventUrlPrefixes(),
			assetFolderUrlPrefix:
				this.collaborators.publicationUrlInput.readAssetFolderUrlPrefix(),
			...context.repo,
			issueNumber,
			locale: messages.locale,
			client: getOctokit(core.getInput("github-token", { required: true })),
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
			slackToken: core.getInput("slack-token", { required: true }),
			slackOrganizerChannelId: core.getInput("slack-organizer-channel-id", {
				required: true,
			}),
		});
		const identity = {
			repository: `${context.repo.owner}/${context.repo.repo}`,
			issueNumber,
		};
		const stageResults = core.getInput("stage-results", { required: true });
		const result = await journey.execute(
			identity,
			this.collaborators.attentionStages.parse(stageResults),
			String(context.runId),
		);

		return {
			details: [
				messages.t(
					result.skipped
						? "report.attention.skipped"
						: "report.attention.updated",
				),
			],
			diagnostics: [],
			...(result.notificationFailed
				? { failure: messages.t("report.attention.failed") }
				: {}),
		};
	}
}
