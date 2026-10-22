import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ManageMeetupPublication } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { AiInput } from "./ai-input.js";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { MeetupPublicationComposition } from "./meetup-publication-composition.js";
import type { MeetupPublicationConfiguration } from "./meetup-publication-configuration.js";
import type { PublicationUrlInput } from "./publication-url-input.js";
import type { RuntimeInput } from "./runtime-input.js";

export interface EventPublicationActionCollaborators {
	readonly aiInput: Pick<AiInput, "read">;
	readonly publicationUrlInput: Pick<
		PublicationUrlInput,
		| "readMeetupEventUrlPrefix"
		| "readCommunityEventUrlPrefixes"
		| "readAssetFolderUrlPrefix"
	>;
	readonly createJourney: (
		input: Parameters<typeof MeetupPublicationComposition.create>[0],
	) => Pick<ManageMeetupPublication, "execute">;
	readonly runtimeInput: Pick<RuntimeInput, "positiveIntegerInput">;
	readonly conferenceHallInput: Pick<ConferenceHallInput, "read">;
	readonly meetupPublicationConfiguration: Pick<
		MeetupPublicationConfiguration,
		"load"
	>;
}

export class EventPublicationAction {
	constructor(
		private readonly collaborators: EventPublicationActionCollaborators,
	) {}

	async run(messages: ActionMessages): Promise<ActionReportData> {
		const issueNumber = this.collaborators.runtimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const email = this.secret("meetup-email");
		const password = this.secret("meetup-password");
		const ai = this.collaborators.aiInput.read();
		const githubToken = this.secret("github-token");
		const { owner, repo } = context.repo;
		const journey = this.collaborators.createJourney({
			meetupEventUrlPrefix:
				this.collaborators.publicationUrlInput.readMeetupEventUrlPrefix(),
			communityEventUrlPrefixes:
				this.collaborators.publicationUrlInput.readCommunityEventUrlPrefixes(),
			assetFolderUrlPrefix:
				this.collaborators.publicationUrlInput.readAssetFolderUrlPrefix(),
			...this.collaborators.conferenceHallInput.read(),
			owner,
			repo,
			issueNumber,
			locale: messages.locale,
			client: getOctokit(githubToken),
			email,
			password,
			ai,
			slackToken: this.secret("slack-token"),
			slackOrganizerChannelId: core.getInput("slack-organizer-channel-id", {
				required: true,
			}),
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
			settings: await this.collaborators.meetupPublicationConfiguration.load(
				process.cwd(),
			),
		});
		const result = await journey.execute({
			repository: `${owner}/${repo}`,
			issueNumber,
		});
		return {
			details: [
				messages.t("report.event.context", { issue: issueNumber, mode: "fix" }),
				messages.t(`report.meetup.${result.status}`),
				...(result.reviewUrl
					? [messages.t("report.meetup.review", { url: result.reviewUrl })]
					: []),
			],
			diagnostics: result.diagnostics,
		};
	}

	private secret(name: string): string {
		const value = core.getInput(name, {
			required: true,
			trimWhitespace: name !== "meetup-password",
		});
		core.setSecret(value);
		return value;
	}
}
