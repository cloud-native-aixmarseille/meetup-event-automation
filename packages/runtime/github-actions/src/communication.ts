import { createHash } from "node:crypto";
import { getOctokit } from "@actions/github";
import { isSafeCommunicationIdentifier } from "@meetup-automation/communication";
import type { EventDocument } from "@meetup-automation/event";
import {
	type CommunicationJourneyDiagnostic,
	createAutomationConfig,
	emptyCommunicationResult,
	ManageMeetupCommunications,
	type ManageMeetupCommunicationsResult,
	resolveCommunicationDispatchMode,
} from "@meetup-automation/journey";
import { createCommunicationContainer } from "./communication-composition.js";

export interface RunCommunicationReconcileInput {
	readonly issueNumber: number;

	readonly requestedMode: "check" | "dispatch";
	readonly dispatchAuthorized: boolean;
	readonly githubToken: string;
	readonly mailingsToken: string;
	readonly slackToken: string;
	readonly slackChannelId: string;
	readonly owner: string;
	readonly repo: string;
	readonly repositoryId?: string;
	/** Caller revision which owns the private referentials. */
	readonly automationRevision: string;
	readonly workspaceRoot?: string;
	readonly managedCommentAuthor: string;
	readonly approvalTrigger?: Readonly<{
		action: string;
		label: string;
		actor: string;
		/** Immutable issue snapshot delivered with the GitHub label event. */
		issueSnapshot?: EventDocument;
	}>;
}

export type RunCommunicationReconcileResult = ManageMeetupCommunicationsResult;

/** Translate runtime credentials into capabilities before entering the application. */
export async function runCommunicationReconcile(
	input: RunCommunicationReconcileInput,
): Promise<RunCommunicationReconcileResult> {
	assertInput(input);
	const config = createAutomationConfig();
	const runtimeDiagnostics: CommunicationJourneyDiagnostic[] = [];
	const githubToken = input.githubToken.trim();
	if (!githubToken) {
		resolveCommunicationDispatchMode(input, config, runtimeDiagnostics);
		runtimeDiagnostics.push({
			code: "communication.github-credential-missing",
			severity: "error",
		});
		return emptyCommunicationResult("check", runtimeDiagnostics);
	}
	const mailingsToken = input.mailingsToken.trim();
	const slackToken = input.slackToken.trim();
	const slackChannelId = input.slackChannelId.trim();
	const container = createCommunicationContainer({
		client: getOctokit(githubToken),
		owner: input.owner,
		repo: input.repo,
		issueNumber: input.issueNumber,
		commentAuthorLogin: input.managedCommentAuthor,
		config,
		workspaceRoot: input.workspaceRoot,
		mailingsToken,
		slackToken,
	});
	const result = await container.get(ManageMeetupCommunications).execute({
		issueNumber: input.issueNumber,
		owner: input.owner,
		repo: input.repo,
		repositoryId: input.repositoryId,
		automationRevision: input.automationRevision,
		requestedMode: input.requestedMode,
		dispatchAuthorized: input.dispatchAuthorized,
		mailGatewayEnabled: mailingsToken.length > 0,
		notificationGatewayEnabled: slackToken.length > 0,
		notificationDestination: slackChannelId,
		approvalTrigger: input.approvalTrigger,
		notificationDestinationFingerprint:
			config.communication["slack-enabled"] && slackChannelId
				? `sha256:${createHash("sha256").update(slackChannelId).digest("hex")}`
				: null,
	});
	return result;
}

function assertInput(input: RunCommunicationReconcileInput): void {
	if (!Number.isSafeInteger(input.issueNumber) || input.issueNumber <= 0) {
		throw new Error("issueNumber must be a positive integer");
	}
	if (!isRepositoryPart(input.owner) || !isRepositoryPart(input.repo)) {
		throw new Error("owner and repo must be valid GitHub repository segments");
	}
	if (!input.managedCommentAuthor.trim()) {
		throw new Error("managedCommentAuthor must not be empty");
	}
	if (!isSafeCommunicationIdentifier(input.automationRevision.trim())) {
		throw new Error(
			"automationRevision must be a stable, PII-free revision identifier",
		);
	}
}

function isRepositoryPart(value: string): boolean {
	return /^[A-Za-z0-9_.-]+$/.test(value);
}
