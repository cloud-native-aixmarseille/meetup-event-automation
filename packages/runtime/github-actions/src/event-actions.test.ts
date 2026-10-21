import * as core from "@actions/core";
import { ListActiveEvents } from "@meetup-automation/event";
import {
	type AutomationConfig,
	ManageMeetupEvent,
} from "@meetup-automation/journey";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventComposition, SERVICES } from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventActions } from "./event-actions.js";

const boundary = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@actions/core", () => ({
	getInput: (name: string) =>
		({
			"conference-hall-event": "example-cfp",
			"conference-hall-api-key": "synthetic-source-key",
			"issue-number": "42",
			"github-token": "private-token",
		})[name],
	setOutput: vi.fn(),
	setSecret: vi.fn(),
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "community", repo: "meetups" } },
	getOctokit: () => ({}),
}));
vi.mock("./composition.js", () => ({
	SERVICES: { config: "config" },
	EventComposition: {
		createDocumentContainer: () => ({
			get: (key: unknown) =>
				key === "config"
					? { event: { "issue-label": "meetup" } }
					: { execute: boundary.execute },
		}),
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
				diagnostics,
				event: { privateData: "contact@example.test" },
			});

			// Act
			const report = await new EventActions({
				createEventJourney: (input) =>
					EventComposition.createEventContainer(input).get(ManageMeetupEvent),
				createEventListing: (input) => {
					const container = EventComposition.createDocumentContainer(input);
					return {
						events: container.get(ListActiveEvents),
						label: container.get<AutomationConfig>(SERVICES.config).event[
							"issue-label"
						],
					};
				},
				runtimeInput: new GithubActionsComposition().runtimeInput(),
				conferenceHallInput:
					new GithubActionsComposition().conferenceHallInput(),
				actionOutput: new GithubActionsComposition().actionOutput(),
				createActionMessages: (...args) =>
					new GithubActionsComposition().actionMessages(...args),
			}).runEventReconcileAction();

			// Assert
			expect(boundary.execute).toHaveBeenCalledWith({
				identity: { repository: "community/meetups", issueNumber: 42 },
				mode: "fix",
			});
			expect(report.details).toContain("issue=42 mode=fix");
			expect(report.details.join("\n")).toContain(
				isReady ? "state=ready ready=true" : "state=draft ready=false",
			);
			expect(report.details).toHaveLength(3);
			expect(report.diagnostics).toEqual(diagnostics);
			expect(report.failure).toBeUndefined();
			expect(JSON.stringify(report)).not.toContain("contact@example.test");
			expect(core.setOutput).not.toHaveBeenCalled();
		},
	);

	it("explains when a non-meetup issue is skipped", async () => {
		// Arrange
		boundary.execute.mockResolvedValue({ skipped: true, diagnostics: [] });

		// Act
		const report = await new EventActions({
			createEventJourney: (input) =>
				EventComposition.createEventContainer(input).get(ManageMeetupEvent),
			createEventListing: (input) => {
				const container = EventComposition.createDocumentContainer(input);
				return {
					events: container.get(ListActiveEvents),
					label: container.get<AutomationConfig>(SERVICES.config).event[
						"issue-label"
					],
				};
			},
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).runEventReconcileAction();

		// Assert
		expect(report.details).toContain("event=skipped reason=unrelated-issue");
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
			const report = await new EventActions({
				createEventJourney: (input) =>
					EventComposition.createEventContainer(input).get(ManageMeetupEvent),
				createEventListing: (input) => {
					const container = EventComposition.createDocumentContainer(input);
					return {
						events: container.get(ListActiveEvents),
						label: container.get<AutomationConfig>(SERVICES.config).event[
							"issue-label"
						],
					};
				},
				runtimeInput: new GithubActionsComposition().runtimeInput(),
				conferenceHallInput:
					new GithubActionsComposition().conferenceHallInput(),
				actionOutput: new GithubActionsComposition().actionOutput(),
				createActionMessages: (...args) =>
					new GithubActionsComposition().actionMessages(...args),
			}).runEventListActiveAction();

			// Assert
			expect(report.details.join("\n")).toContain(
				issueNumbers.length === 0 ? "active_events=0" : "issues=12, 34",
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
