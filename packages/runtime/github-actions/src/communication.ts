import {
	ConferenceHallInput,
	type ConferenceHallSettings,
} from "./conference-hall-input.js";
import { getOctokit } from "@actions/github";
import {
	AutomationConfigFactory,
	type CommunicationJourneyDiagnostic,
	ManageMeetupCommunications,
	type ManageMeetupCommunicationsResult,
} from "@meetup-automation/journey";
import { CommunicationComposition } from "./communication-composition.js";
import { OrganizerNotificationMessages } from "./notifications/organizer-notification-messages.js";

export interface RunCommunicationReconcileInput extends ConferenceHallSettings {
	readonly locale?: string;
	readonly issueNumber: number;

	readonly githubToken: string;
	readonly mailingsToken: string;
	readonly openFeedbackApiKey?: string;
	readonly slackToken: string;
	readonly slackOrganizerChannelId: string;
	readonly owner: string;
	readonly repo: string;
	readonly repositoryId?: string;
	readonly workspaceRoot?: string;
	readonly managedCommentAuthor: string;
	readonly slidesUrl?: string;
	readonly slidesReady?: boolean;
}

export type RunCommunicationReconcileResult = ManageMeetupCommunicationsResult;

export class CommunicationRuntime {
	/** Compose authenticated gateways before entering the application. */
	static async runCommunicationReconcile(
		input: RunCommunicationReconcileInput,
	): Promise<RunCommunicationReconcileResult> {
		CommunicationRuntime.assertInput(input);
		const config = AutomationConfigFactory.createAutomationConfig(input.owner);
		const runtimeDiagnostics: CommunicationJourneyDiagnostic[] = [];
		const githubToken = input.githubToken.trim();
		if (!githubToken) {
			ManageMeetupCommunications.isDispatchEnabled(config, runtimeDiagnostics);
			runtimeDiagnostics.push({
				code: "communication.github-credential-missing",
				severity: "error",
			});
			return ManageMeetupCommunications.emptyCommunicationResult(
				"check",
				runtimeDiagnostics,
			);
		}
		const mailingsToken = input.mailingsToken.trim();
		const slackToken = input.slackToken.trim();
		const slackOrganizerChannelId = input.slackOrganizerChannelId.trim();
		const messages = new OrganizerNotificationMessages(input.locale);
		const container = CommunicationComposition.createCommunicationContainer({
			locale: messages.locale,
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
			organizerNotificationDestination: slackOrganizerChannelId,
			slidesUrl: input.slidesUrl,
			slidesReady: input.slidesReady,
		});
		return result;
	}

	static assertInput(input: RunCommunicationReconcileInput): void {
		ConferenceHallInput.validate(input);
		if (!Number.isSafeInteger(input.issueNumber) || input.issueNumber <= 0) {
			throw new Error("issueNumber must be a positive integer");
		}
		if (
			!CommunicationRuntime.isRepositoryPart(input.owner) ||
			!CommunicationRuntime.isRepositoryPart(input.repo)
		) {
			throw new Error(
				"owner and repo must be valid GitHub repository segments",
			);
		}
		if (!input.slackOrganizerChannelId.trim()) {
			throw new Error("slackOrganizerChannelId must not be empty");
		}
		if (!input.managedCommentAuthor.trim()) {
			throw new Error("managedCommentAuthor must not be empty");
		}
	}

	static isRepositoryPart(value: string): boolean {
		return /^[A-Za-z0-9_.-]+$/.test(value);
	}
}
