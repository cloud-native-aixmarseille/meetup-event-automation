import { getOctokit } from "@actions/github";
import {
	AutomationConfigFactory,
	ManageMeetupCommunications,
	type ManageMeetupCommunicationsResult,
} from "@meetup-automation/journey";
import { MessageLocalizer } from "@meetup-automation/localization";
import { CommunicationComposition } from "./communication-composition.js";
import {
	CommunicationInput,
	type RunCommunicationReconcileInput,
} from "./communication-input.js";

export type { RunCommunicationReconcileInput } from "./communication-input.js";

export type RunCommunicationReconcileResult = ManageMeetupCommunicationsResult;

export class CommunicationRuntime {
	/** Compose authenticated gateways before entering the application. */
	static async runCommunicationReconcile(
		input: RunCommunicationReconcileInput,
	): Promise<RunCommunicationReconcileResult> {
		CommunicationInput.validate(input);
		const config = AutomationConfigFactory.createAutomationConfig(input.owner);
		const githubToken = input.githubToken.trim();
		const mailingsToken = input.mailingsToken.trim();
		const slackToken = input.slackToken.trim();
		const slackOrganizerChannelId = input.slackOrganizerChannelId.trim();
		const container = CommunicationComposition.createCommunicationContainer({
			locale: MessageLocalizer.resolveLocale(input.locale),
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
		const result = await container.get(ManageMeetupCommunications).execute({
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
