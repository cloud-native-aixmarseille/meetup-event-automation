import {
	ConferenceHallInput,
	type ConferenceHallSettings,
} from "./conference-hall-input.js";
export interface RunCommunicationReconcileInput extends ConferenceHallSettings {
	readonly locale: string;
	readonly issueNumber: number;

	readonly githubToken: string;
	readonly mailingsToken: string;
	readonly openFeedbackApiKey: string;
	readonly slackToken: string;
	readonly slackOrganizerChannelId: string;
	readonly owner: string;
	readonly repo: string;
	readonly repositoryId?: string;
	readonly workspaceRoot?: string;
	readonly managedCommentAuthor: string;
	readonly slidesUrl?: string;
	readonly slidesReady: boolean;
}

/** Validates invocation data before credentials are used by composition. */
export class CommunicationInput {
	static validate(input: RunCommunicationReconcileInput): void {
		ConferenceHallInput.validate(input);
		for (const field of [
			"locale",
			"githubToken",
			"mailingsToken",
			"slackToken",
			"openFeedbackApiKey",
		] as const)
			if (!input[field]?.trim())
				throw new Error(`Input required and not supplied: ${field}`);
		if (typeof input.slidesReady !== "boolean")
			throw new Error("slidesReady must be an explicit boolean");
		if (!Number.isSafeInteger(input.issueNumber) || input.issueNumber <= 0) {
			throw new Error("issueNumber must be a positive integer");
		}
		if (
			!CommunicationInput.isRepositoryPart(input.owner) ||
			!CommunicationInput.isRepositoryPart(input.repo)
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
