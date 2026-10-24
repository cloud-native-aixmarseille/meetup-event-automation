import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ReconcileEventPublications } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type { EventPublicationConfiguration } from "./event-publication-configuration.js";
import type { EventPublicationJourneyComposition } from "./event-publication-journey-composition.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { PublicationCredentialsInput } from "./publication-credentials-input.js";
import type { PublicationUrlInput } from "./publication-url-input.js";
import type { RuntimeInput } from "./runtime-input.js";

export interface EventPublicationActionCollaborators {
	readonly credentials: Pick<PublicationCredentialsInput, "read">;
	readonly publicationUrlInput: Pick<
		PublicationUrlInput,
		| "readMeetupEventUrlPrefix"
		| "readCommunityEventUrlPrefixes"
		| "readAssetFolderUrlPrefix"
	>;
	readonly createJourney: (
		input: Parameters<typeof EventPublicationJourneyComposition.create>[0],
	) => Pick<ReconcileEventPublications, "execute">;
	readonly runtimeInput: Pick<RuntimeInput, "positiveIntegerInput">;
	readonly conferenceHallInput: Pick<ConferenceHallInput, "read">;
	readonly eventPublicationConfiguration: Pick<
		EventPublicationConfiguration,
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
		const configuration =
			await this.collaborators.eventPublicationConfiguration.load(
				process.cwd(),
			);
		const adapters = this.collaborators.credentials.read(
			configuration.destinations,
		);
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
			adapters,
			slackToken: this.secret("slack-token"),
			slackOrganizerChannelId: core.getInput("slack-organizer-channel-id", {
				required: true,
			}),
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
		});
		const result = await journey.execute({
			repository: `${owner}/${repo}`,
			issueNumber,
		});
		return {
			details: [
				messages.t("report.event.context", { issue: issueNumber, mode: "fix" }),
				...result.publications.flatMap((publication) => [
					messages.t(`report.publication.${publication.status}`, {
						provider: publication.destination.provider,
					}),
					...(publication.reviewUrl
						? [
								messages.t("report.publication.review", {
									provider: publication.destination.provider,
									url: publication.reviewUrl,
								}),
							]
						: []),
				]),
			],
			diagnostics: result.diagnostics,
		};
	}

	private secret(name: string): string {
		const value = core.getInput(name, {
			required: true,
			trimWhitespace: false,
		});
		core.setSecret(value);
		return value;
	}
}
