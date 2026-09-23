import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventActions } from "./event-actions.js";

const boundary = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@actions/core", () => ({
	getInput: (name: string) =>
		({
			"issue-number": "42",
			mode: "check",
			"github-token": "private-token",
			"managed-comment-author": "automation[bot]",
		})[name],
	setOutput: vi.fn(),
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "community", repo: "meetups" } },
	getOctokit: () => ({}),
}));
vi.mock("./composition.js", () => ({
	SERVICES: { config: "config" },
	EventComposition: {
		createEventContainer: () => ({
			get: (key: unknown) =>
				key === "config"
					? { event: { "issue-label": "meetup" } }
					: { execute: boundary.execute },
		}),
	},
}));

describe("event action report facts", () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([true, false])(
		"reports event readiness when ready is %s without exposing the event payload",
		async (isReady) => {
			// Arrange
			const diagnostics = [
				{
					code: "event.example",
					severity: "warning",
					field: "date",
					message: "Confirm the date.",
				},
			];
			boundary.execute.mockResolvedValue({
				skipped: false,
				state: isReady ? "ready" : "draft",
				isReady,
				persisted: false,
				commentUpdated: false,
				diagnostics,
				event: { privateData: "contact@example.test" },
			});

			// Act
			const report = await EventActions.runEventReconcileAction();

			// Assert
			expect(report.details).toContain("Issue: #42; mode: check.");
			expect(report.details.join("\n")).toContain(
				isReady
					? "Event state: ready; ready: true."
					: "Event state: draft; ready: false.",
			);
			expect(
				report.details.join("\n").includes("Resolve the event fields"),
			).toBe(!isReady);
			expect(report.diagnostics).toEqual(diagnostics);
			expect(report.failure).toBeUndefined();
			expect(JSON.stringify(report)).not.toContain("contact@example.test");
			expect(core.setOutput).toHaveBeenCalledWith("is-ready", String(isReady));
		},
	);

	it("explains when a non-meetup issue is skipped", async () => {
		// Arrange
		boundary.execute.mockResolvedValue({ skipped: true, diagnostics: [] });

		// Act
		const report = await EventActions.runEventReconcileAction();

		// Assert
		expect(report.details).toContain(
			"Skipped: the issue is not a configured meetup event.",
		);
		expect(core.setOutput).toHaveBeenCalledWith("state", "skipped");
	});

	it.each([{ issueNumbers: [] }, { issueNumbers: [12, 34] }])(
		"reports the selected active issue numbers: $issueNumbers",
		async ({ issueNumbers }) => {
			// Arrange
			const diagnostics = [
				{
					code: "event.example",
					severity: "warning",
					field: "date",
					message: "Confirm the date.",
					category: "incomplete",
				},
			];
			boundary.execute.mockResolvedValue({
				events: issueNumbers.map((issueNumber) => ({
					identity: { issueNumber },
					event: { privateData: "contact@example.test" },
				})),
				diagnostics,
			});

			// Act
			const report = await EventActions.runEventListActiveAction();

			// Assert
			expect(report.details.join("\n")).toContain(
				issueNumbers.length === 0
					? "No active meetup events were found."
					: "Issue numbers: 12, 34.",
			);
			expect(report.diagnostics).toEqual([
				{
					code: "event.example",
					severity: "warning",
					field: "date",
					message: "Confirm the date.",
				},
			]);
			expect(core.setOutput).toHaveBeenCalledWith(
				"issue-numbers",
				JSON.stringify(issueNumbers),
			);
			expect(JSON.stringify(report)).not.toContain("contact@example.test");
		},
	);
});
