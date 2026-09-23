import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommunicationAction } from "./communication-action.js";

const boundary = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@actions/core", () => ({
	getInput: (name: string) =>
		({
			"issue-number": "42",
			mode: "check",
			"dispatch-authorized": "false",
			"github-token": "private-token",
			"managed-comment-author": "automation[bot]",
		})[name] ?? "",
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
	beforeEach(() => vi.clearAllMocks());

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
		expect(report.details).toContain("Communication mode: dispatch.");
		expect(report.details.join("\n")).toContain("Accepted: 1;");
		expect(report.details.join("\n")).not.toContain("before retrying");
		expect(report.details.join("\n")).not.toContain("before any resend");
		expect(report.diagnostics).toEqual([]);
		expect(report.failure).toBeUndefined();
	});
});
