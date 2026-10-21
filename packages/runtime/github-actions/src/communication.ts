import { getOctokit } from "@actions/github";
import type {
	AutomationConfigFactory,
	ManageMeetupCommunications,
	ManageMeetupCommunicationsResult,
} from "@meetup-automation/journey";
import type { LocaleResolver } from "@meetup-automation/localization";
import type { CommunicationComposition } from "./communication-composition.js";
import type {
	CommunicationInput,
	RunCommunicationReconcileInput,
} from "./communication-input.js";

export type { RunCommunicationReconcileInput } from "./communication-input.js";

export type RunCommunicationReconcileResult = ManageMeetupCommunicationsResult;

export interface CommunicationRuntimeCollaborators {
	readonly createJourney: (
		input: Parameters<
			typeof CommunicationComposition.createCommunicationContainer
		>[0],
	) => Pick<ManageMeetupCommunications, "execute">;
	readonly communicationInput: Pick<CommunicationInput, "validate">;
	readonly automationConfigFactory: Pick<
		AutomationConfigFactory,
		"createAutomationConfig"
	>;
	readonly localeResolver: Pick<LocaleResolver, "resolveLocale">;
}

export class CommunicationRuntime {
	constructor(
		private readonly collaborators: CommunicationRuntimeCollaborators,
	) {}

	/** Compose authenticated gateways before entering the application. */
	async runCommunicationReconcile(
		input: RunCommunicationReconcileInput,
	): Promise<RunCommunicationReconcileResult> {
		this.collaborators.communicationInput.validate(input);
		const config =
			this.collaborators.automationConfigFactory.createAutomationConfig(
				input.owner,
			);
		const githubToken = input.githubToken.trim();
		const mailingsToken = input.mailingsToken.trim();
		const slackToken = input.slackToken.trim();
		const slackOrganizerChannelId = input.slackOrganizerChannelId.trim();
		const journey = this.collaborators.createJourney({
			locale: this.collaborators.localeResolver.resolveLocale(input.locale),
			conferenceHallEvent: input.conferenceHallEvent,
			conferenceHallApiKey: input.conferenceHallApiKey,
			client: getOctokit(githubToken),
			owner: input.owner,
			repo: input.repo,
			issueNumber: input.issueNumber,
			commentAuthorLogin: input.managedCommentAuthor,
			config,
			workspaceRoot: input.workspaceRoot,
			mailingsToken,
			openFeedbackApiKey: input.openFeedbackApiKey,
			slackToken,
			slackOrganizerChannelId,
		});
		const result = await journey.execute({
			issueNumber: input.issueNumber,
			owner: input.owner,
			repo: input.repo,
			repositoryId: input.repositoryId,
			slidesUrl: input.slidesUrl,
			slidesReady: input.slidesReady,
		});
		return result;
	}
}
