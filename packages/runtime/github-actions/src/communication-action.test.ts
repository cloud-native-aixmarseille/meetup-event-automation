import * as core from "@actions/core";
import { JourneyPolicyComposition } from "@meetup-automation/journey";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	eventPublicationSettings,
	publicationUrlInputs,
} from "../testing/publication-urls.fixtures.js";
import { CommunicationAction } from "./communication-action.js";
import { GithubActionsComposition } from "./dependency-composition.js";

const boundary = vi.hoisted(() => ({
	execute: vi.fn(),
	listComments: vi.fn(),
	createComment: vi.fn(),
	updateComment: vi.fn(),
}));
vi.mock("@actions/core", async (importOriginal) => ({
	...(await importOriginal<typeof core>()),
	setOutput: vi.fn(),
	setSecret: vi.fn(),
	setFailed: vi.fn(),
	info: vi.fn(),
	error: vi.fn(),
	warning: vi.fn(),
	notice: vi.fn(),
	summary: {
		addHeading: vi.fn().mockReturnThis(),
		addRaw: vi.fn().mockReturnThis(),
		write: vi.fn().mockResolvedValue(undefined),
		clear: vi.fn(),
	},
}));
vi.mock("@actions/github", () => ({
	getOctokit: vi.fn(() => ({ rest: { issues: boundary } })),
	context: {
		repo: { owner: "community", repo: "meetups" },
		payload: {},
		actor: "maintainer",
	},
}));

describe("communication action report facts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		boundary.listComments.mockResolvedValue({ data: [], headers: {} });
		for (const [name, value] of Object.entries({
			...publicationUrlInputs,
			locale: "en",
			"slides-ready": "true",
			"openfeedback-api-key": "oforg_synthetic-key",
			"conference-hall-event": "example-cfp",
			"conference-hall-api-key": "synthetic-source-key",
			"issue-number": "42",
			"slides-url": "https://docs.google.com/presentation/d/event-slides/edit",
			"github-token": "private-token",
			"mailings-token": "private-mailings-token",
			"slack-token": "private-slack-token",
			"slack-organizer-channel-id": "organizer-channel-id",
			"managed-comment-author": "automation[bot]",
		})) {
			vi.stubEnv(`INPUT_${name.toUpperCase()}`, value);
		}
	});

	afterEach(() => vi.unstubAllEnvs());

	it.each([
		"meetup-event-url-prefix",
		"community-event-url-prefixes",
		"asset-folder-url-prefix",
		"slides-url",
		"slides-ready",
		"openfeedback-api-key",
		"conference-hall-event",
		"conference-hall-api-key",
		"mailings-token",
		"slack-token",
		"slack-organizer-channel-id",
	])("requires %s before reconciling communications", async (input) => {
		// Arrange
		vi.stubEnv(`INPUT_${input.toUpperCase()}`, "");

		// Act
		const operation = subject().runCommunicationReconcileAction(
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		await expect(operation).rejects.toThrow(
			`Input required and not supplied: ${input}`,
		);
		expect(boundary.execute).not.toHaveBeenCalled();
		expect(core.setOutput).not.toHaveBeenCalled();
	});

	it("requires the organizer channel even when a generic Slack channel is configured", async () => {
		// Arrange
		vi.stubEnv("INPUT_SLACK-ORGANIZER-CHANNEL-ID", "");
		vi.stubEnv("INPUT_SLACK-CHANNEL-ID", "public-channel-id");

		// Act
		const operation = subject().runCommunicationReconcileAction(
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		await expect(operation).rejects.toThrow(
			"Input required and not supplied: slack-organizer-channel-id",
		);
		expect(boundary.execute).not.toHaveBeenCalled();
	});

	it.each(["warning", "error"] as const)(
		"reports safe technical facts for %s diagnostics",
		async (severity) => {
			// Arrange
			boundary.execute.mockResolvedValue({
				mode: "check",
				counts: {
					planned: 2,
					due: 1,
					dispatched: 0,
					reserved: 0,
					accepted: 0,
					alreadyRecorded: 1,
					deferred: 0,
					uncertain: 1,
					rejected: 0,
				},
				intentIds: ["private@example.test"],
				diagnostics: [
					{
						code: "gateway-delivery-uncertain",
						severity,
						intentId: "private@example.test",
						message: "private provider response",
					},
				],
				runtimeDiagnostics: [
					{
						code: "communication.checklist-update-failed",
						severity: "warning",
						message: "private checklist data",
					},
				],
			});

			// Act
			const report = await subject().runCommunicationReconcileAction(
				new GithubActionsComposition().actionMessages("en"),
			);

			// Assert
			expect(report.details).toContain("communication_mode=check");
			expect(report.details.join("\n")).toContain(
				"planned=2 due=1 dispatched=0",
			);
			expect(report.diagnostics).toContainEqual({
				code: "communication.gateway-delivery-uncertain",
				severity,
				message: "A gateway could not confirm delivery.",
			});
			expect(report.diagnostics).toContainEqual({
				code: "communication.checklist-update-failed",
				severity: "warning",
				message:
					"Delivery results are recorded but checklist completion could not be persisted.",
			});
			expect(report.failure).toBeUndefined();
			expect(boundary.createComment).not.toHaveBeenCalled();
			expect(boundary.listComments).not.toHaveBeenCalled();

			expect(
				JSON.stringify([report, vi.mocked(core.setOutput).mock.calls]),
			).not.toContain("private");
		},
	);

	it("reports successful reconciliation without a failure", async () => {
		// Arrange
		boundary.execute.mockResolvedValue({
			mode: "dispatch",
			counts: {
				planned: 1,
				due: 1,
				dispatched: 1,
				reserved: 1,
				accepted: 1,
				alreadyRecorded: 0,
				deferred: 0,
				uncertain: 0,
				rejected: 0,
			},
			intentIds: ["synthetic-intent"],
			diagnostics: [],
			runtimeDiagnostics: [],
		});

		// Act
		const report = await subject().runCommunicationReconcileAction(
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(boundary.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				...eventPublicationSettings,
				slidesUrl: "https://docs.google.com/presentation/d/event-slides/edit",
				mailingsToken: "private-mailings-token",
				slackToken: "private-slack-token",
				slackOrganizerChannelId: "organizer-channel-id",
			}),
		);
		expect(report.details).toContain("communication_mode=dispatch");
		expect(report.details.join("\n")).toContain("accepted=1");
		expect(report.details.join("\n")).not.toContain("before retrying");
		expect(report.details.join("\n")).not.toContain("before any resend");
		expect(report.diagnostics).toEqual([]);
		expect(report.failure).toBeUndefined();
	});

	it.each([
		["communication.event-references-unresolved", "error", false],
		["communication.approval-pending", "warning", false],
		["communication.checklist-update-failed", "warning", true],
		["communication.approval-unavailable", "error", true],
	] as const)(
		"uses technical classification for %s with severity %s",
		async (code, severity, fails) => {
			// Arrange
			boundary.execute.mockResolvedValue(
				new JourneyPolicyComposition()
					.communicationJourneyResults()
					.emptyCommunicationResult("check", [{ code, severity }]),
			);

			// Act
			await new GithubActionsComposition()
				.actionRunner()
				.run(
					"action.communication.reconcile",
					subject().runCommunicationReconcileAction.bind(subject()),
					true,
				);

			// Assert
			expect(core.setFailed).toHaveBeenCalledTimes(fails ? 1 : 0);
			expect(core.setOutput).toHaveBeenCalledWith(
				"diagnostics",
				expect.stringContaining(`"severity":"${severity}"`),
			);
			expect(boundary.listComments).not.toHaveBeenCalled();
			expect(boundary.createComment).not.toHaveBeenCalled();
			expect(boundary.updateComment).not.toHaveBeenCalled();
			expect(core.error).not.toHaveBeenCalled();
			expect(core.warning).not.toHaveBeenCalled();
		},
	);

	it("redacts unexpected execution failures", async () => {
		// Arrange
		boundary.execute.mockRejectedValueOnce(
			new Error("private provider response"),
		);

		// Act
		await new GithubActionsComposition()
			.actionRunner()
			.run(
				"action.communication.reconcile",
				subject().runCommunicationReconcileAction.bind(subject()),
				true,
			);

		// Assert
		expect(core.setFailed).toHaveBeenCalledExactlyOnceWith(
			"Unexpected technical failure.",
		);
		expect(core.setOutput).toHaveBeenCalledWith(
			"diagnostics",
			expect.stringContaining("action.execution.failed"),
		);
		expect(
			JSON.stringify([
				vi.mocked(core.setFailed).mock.calls,
				vi.mocked(core.summary.addRaw).mock.calls,
			]),
		).not.toContain("private provider response");
	});

	it("preserves explicit false slides readiness", async () => {
		// Arrange
		vi.stubEnv("INPUT_SLIDES-READY", "false");
		boundary.execute.mockResolvedValue(
			new JourneyPolicyComposition()
				.communicationJourneyResults()
				.emptyCommunicationResult("check", []),
		);

		// Act
		await subject().runCommunicationReconcileAction(
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(boundary.execute).toHaveBeenCalledWith(
			expect.objectContaining({ slidesReady: false }),
		);
	});

	it("reports unavailable slides without an input failure when assets have no presentation", async () => {
		// Arrange
		vi.stubEnv("INPUT_SLIDES-READY", "false");
		vi.stubEnv("INPUT_SLIDES-URL", "");
		boundary.execute.mockResolvedValue(
			new JourneyPolicyComposition()
				.communicationJourneyResults()
				.emptyCommunicationResult("check", [
					{ code: "communication.slides-unavailable", severity: "error" },
				]),
		);

		// Act
		const report = await subject().runCommunicationReconcileAction(
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(boundary.execute).toHaveBeenCalledWith(
			expect.objectContaining({ slidesReady: false, slidesUrl: undefined }),
		);
		expect(report.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "communication.slides-unavailable",
				severity: "error",
			}),
		);
	});

	it.each(["slides-ready"])(
		"rejects an invalid %s before executing communications",
		async (input) => {
			// Arrange
			vi.stubEnv(`INPUT_${input.toUpperCase()}`, "invalid");

			// Act
			const result = subject().runCommunicationReconcileAction(
				new GithubActionsComposition().actionMessages("en"),
			);

			// Assert
			await expect(result).rejects.toThrow(`${input} must be true or false`);
			expect(boundary.execute).not.toHaveBeenCalled();
		},
	);
});

function subject() {
	return new CommunicationAction({
		publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
		runtimeInput: new GithubActionsComposition().runtimeInput(),
		communicationRuntime: { runCommunicationReconcile: boundary.execute },
		conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		communicationDiagnosticProjection:
			new JourneyPolicyComposition().communicationDiagnosticProjection(),
	});
}
