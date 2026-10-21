import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ManageMeetupFeedback } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type { FeedbackComposition } from "./feedback-composition.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { PublicationUrlInput } from "./publication-url-input.js";
import type { RuntimeInput } from "./runtime-input.js";

export interface FeedbackActionCollaborators {
	readonly publicationUrlInput: Pick<
		PublicationUrlInput,
		| "readMeetupEventUrlPrefix"
		| "readCommunityEventUrlPrefixes"
		| "readAssetFolderUrlPrefix"
	>;
	readonly createJourney: (
		input: Parameters<typeof FeedbackComposition.createFeedbackContainer>[0],
	) => Pick<ManageMeetupFeedback, "execute">;
	readonly runtimeInput: Pick<RuntimeInput, "positiveIntegerInput">;
	readonly conferenceHallInput: Pick<ConferenceHallInput, "read">;
}

export class FeedbackAction {
	constructor(private readonly collaborators: FeedbackActionCollaborators) {}

	async run(messages: ActionMessages): Promise<ActionReportData> {
		const issueNumber = this.collaborators.runtimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const kuttApiKey = this.requiredInput("kutt-api-key");
		core.setSecret(kuttApiKey);
		const kuttLinkId = this.requiredInput("kutt-link-id");
		const kuttBaseUrl = this.requiredInput("kutt-base-url");
		const openFeedbackApiKey = this.requiredInput("openfeedback-api-key");
		core.setSecret(openFeedbackApiKey);
		const { owner, repo } = context.repo;
		const journey = this.collaborators.createJourney({
			meetupEventUrlPrefix:
				this.collaborators.publicationUrlInput.readMeetupEventUrlPrefix(),
			communityEventUrlPrefixes:
				this.collaborators.publicationUrlInput.readCommunityEventUrlPrefixes(),
			assetFolderUrlPrefix:
				this.collaborators.publicationUrlInput.readAssetFolderUrlPrefix(),
			locale: messages.locale,
			...this.collaborators.conferenceHallInput.read(),
			client: getOctokit(core.getInput("github-token", { required: true })),
			owner,
			repo,
			kuttApiKey,
			kuttBaseUrl,
			kuttLinkId,
			openFeedbackApiKey,
		});
		const outcome = await journey.execute({
			identity: { repository: `${owner}/${repo}`, issueNumber },
		});
		return this.report(issueNumber, outcome, messages);
	}

	private requiredInput(
		name:
			| "kutt-api-key"
			| "kutt-base-url"
			| "kutt-link-id"
			| "openfeedback-api-key",
	): string {
		const value = core.getInput(name, { required: true });
		if (!value) throw new Error(`Input required and not supplied: ${name}`);
		return value;
	}

	private report(
		issueNumber: number,
		outcome: Awaited<ReturnType<ManageMeetupFeedback["execute"]>>,
		messages: ActionMessages,
	): ActionReportData {
		const { diagnostics, ...result } = outcome;

		return {
			details: [
				messages.t("report.event.context", { issue: issueNumber, mode: "fix" }),
				result.skipped
					? messages.t("report.feedback.skipped")
					: messages.t("report.feedback.completed"),
				messages.t("report.feedback.changes", {
					persisted: String(result.persisted),
					linkUpdated: String(result.linkUpdated),
				}),
			],
			diagnostics,
		};
	}
}
