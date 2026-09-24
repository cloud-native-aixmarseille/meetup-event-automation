import * as core from "@actions/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunicationAction } from "./communication-action.js";

const boundary = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@actions/core", async (importOriginal) => ({
	...(await importOriginal<typeof core>()),
	setOutput: vi.fn(),
}));
vi.mock("@actions/github", () => ({
	context: {
		repo: { owner: "community", repo: "meetups" },
		payload: {},
		actor: "maintainer",
	},
}));
vi.mock("./communication.js", () => ({
	CommunicationRuntime: { runCommunicationReconcile: boundary.execute },
}));

describe("communication action report facts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		for (const [name, value] of Object.entries({
			"issue-number": "42",
			mode: "check",
			"dispatch-authorized": "false",
			"github-token": "private-token",
			"mailings-token": "private-mailings-token",
			"slack-token": "private-slack-token",
			"slack-channel-id": "channel-safe-id",
			"managed-comment-author": "automation[bot]",
		})) {
			vi.stubEnv(`INPUT_${name.toUpperCase()}`, value);
		}
	});

	afterEach(() => vi.unstubAllEnvs());

	it.each([
		["mailings-token", "check"],
		["slack-token", "check"],
		["slack-channel-id", "check"],
		["mailings-token", "dispatch"],
		["slack-token", "dispatch"],
		["slack-channel-id", "dispatch"],
	])("requires %s before reconciling in %s mode", async (input, mode) => {
		// Arrange
		vi.stubEnv(`INPUT_${input.toUpperCase()}`, "");
		vi.stubEnv("INPUT_MODE", mode);

		// Act
		const operation = CommunicationAction.runCommunicationReconcileAction();

		// Assert
		await expect(operation).rejects.toThrow(
			`Input required and not supplied: ${input}`,
		);
		expect(boundary.execute).not.toHaveBeenCalled();
		expect(core.setOutput).not.toHaveBeenCalled();
	});

	it.each(["warning", "error"] as const)(
		"redacts provider data and preserves failure policy for %s diagnostics",
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
						code: "communication.approval-missing",
						severity: "warning",
						message: "private approval data",
					},
				],
			});

			// Act
			const report =
				await CommunicationAction.runCommunicationReconcileAction();

			// Assert
			expect(report.details).toContain("Communication mode: check.");
			expect(report.details.join("\n")).toContain(
				"Planned: 2; due: 1; dispatched: 0.",
			);
			expect(report.details.join("\n")).toContain(
				"Reconcile uncertain deliveries",
			);
			expect(report.diagnostics).toContainEqual({
				code: "communication.gateway-delivery-uncertain",
				severity,
				message: "A gateway could not confirm delivery.",
			});
			expect(report.diagnostics).toContainEqual({
				code: "communication.approval-missing",
				severity: "warning",
				message: "Communications require a maintainer-owned approval snapshot.",
			});
			expect(Boolean(report.failure)).toBe(severity === "error");
			expect(core.setOutput).toHaveBeenCalledWith("planned-count", "2");
			expect(core.setOutput).toHaveBeenCalledWith(
				"result",
				expect.stringContaining("sha256:"),
			);
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
		const report = await CommunicationAction.runCommunicationReconcileAction();

		// Assert
		expect(boundary.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				mailingsToken: "private-mailings-token",
				slackToken: "private-slack-token",
				slackChannelId: "channel-safe-id",
			}),
		);
		expect(report.details).toContain("Communication mode: dispatch.");
		expect(report.details.join("\n")).toContain("Accepted: 1;");
		expect(report.details.join("\n")).not.toContain("before retrying");
		expect(report.details.join("\n")).not.toContain("before any resend");
		expect(report.diagnostics).toEqual([]);
		expect(report.failure).toBeUndefined();
	});
});
