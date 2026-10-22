import { ReconcileMeetupFeedback } from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	eventPublicationSettings,
	publicationUrlInputs,
} from "../testing/publication-urls.fixtures.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { FeedbackAction } from "./feedback-action.js";
import { FeedbackComposition } from "./feedback-composition.js";
import { ActionMessages } from "./i18n/action-messages.js";

const mocks = vi.hoisted(() => ({
	inputs: {} as Record<string, string>,
	outputs: {} as Record<string, string>,
	setSecret: vi.fn(),
	getOctokit: vi.fn(),
	compose: vi.fn(),
	execute: vi.fn(),
}));
vi.mock("@actions/core", () => ({
	getInput: (name: string, options?: { required?: boolean }) => {
		const value = mocks.inputs[name] ?? "";
		if (options?.required && !value)
			throw new Error(`Input required and not supplied: ${name}`);
		return value.trim();
	},
	setOutput: (name: string, value: string) => {
		mocks.outputs[name] = value;
	},
	setSecret: mocks.setSecret,
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "example", repo: "meetups" } },
	getOctokit: mocks.getOctokit,
}));
vi.mock("./feedback-composition.js", () => ({
	FeedbackComposition: { createFeedbackContainer: mocks.compose },
}));

beforeEach(() => {
	vi.clearAllMocks();
	mocks.inputs = {
		...publicationUrlInputs,
		"conference-hall-event": "example-cfp",
		"conference-hall-api-key": "synthetic-source-key",
		"issue-number": "12",
		"github-token": "synthetic-token",
		"openfeedback-api-key": "oforg_synthetic-secret",
	};
	mocks.outputs = {};
	mocks.compose.mockReturnValue({ get: () => ({ execute: mocks.execute }) });
	mocks.execute.mockResolvedValue({
		skipped: false,
		persisted: true,
		feedbackUrl: "https://openfeedback.io/poll",
		diagnostics: [],
	});
});

describe("feedback action boundary", () => {
	it.each([
		["meetup-event-url-prefix", ""],
		["community-event-url-prefixes", ""],
		["asset-folder-url-prefix", ""],
		["conference-hall-event", ""],
		["conference-hall-event", "   "],
		["conference-hall-api-key", ""],
		["conference-hall-api-key", "   "],
	])(
		"rejects missing or blank %s (%j) before requests",
		async (name, value) => {
			// Arrange
			mocks.inputs[name] = value;

			// Act
			const operation = new FeedbackAction({
				publicationUrlInput:
					new GithubActionsComposition().publicationUrlInput(),
				createJourney: (input) =>
					FeedbackComposition.createFeedbackContainer(input).get(
						ReconcileMeetupFeedback,
					),
				runtimeInput: new GithubActionsComposition().runtimeInput(),
				conferenceHallInput:
					new GithubActionsComposition().conferenceHallInput(),
			}).run(new GithubActionsComposition().actionMessages("en"));

			// Assert
			await expect(operation).rejects.toThrow(
				`Input required and not supplied: ${name}`,
			);
			expect(mocks.getOctokit).not.toHaveBeenCalled();
			expect(mocks.compose).not.toHaveBeenCalled();
			expect(mocks.outputs).toEqual({});
		},
	);

	it("masks credentials and reconciles feedback without a mode input", async () => {
		// Arrange
		// Required credentials are supplied at the boundary.

		// Act
		const report = await new FeedbackAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			createJourney: (input) =>
				FeedbackComposition.createFeedbackContainer(input).get(
					ReconcileMeetupFeedback,
				),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		}).run(new GithubActionsComposition().actionMessages("en"));

		// Assert
		expect(report.details).toContain("feedback=completed");
		expect(report.details).toContain("issue_persisted=true");
		expect(report.diagnostics).toEqual([]);
		expect(mocks.outputs.diagnostics).toBeUndefined();
		expect(mocks.setSecret).toHaveBeenCalledWith("oforg_synthetic-secret");
		expect(mocks.execute).toHaveBeenCalledWith({
			identity: { repository: "example/meetups", issueNumber: 12 },
		});
		expect(mocks.outputs).toEqual({});
		expect(JSON.stringify(mocks.outputs)).not.toContain("synthetic-");
	});

	it("forwards event publication settings", async () => {
		// Arrange
		// Default inputs provide all required publication URL policies.

		// Act
		await new FeedbackAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			createJourney: (input) =>
				FeedbackComposition.createFeedbackContainer(input).get(
					ReconcileMeetupFeedback,
				),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		}).run(new GithubActionsComposition().actionMessages("en"));

		// Assert
		expect(mocks.compose).toHaveBeenCalledWith(
			expect.objectContaining({
				...eventPublicationSettings,
			}),
		);
	});
	it("reports skipped reconciliation without changing its success policy", async () => {
		// Arrange
		const diagnostics = [
			{
				code: "publication.feedback.inactive",
				severity: "info",
				message: "Feedback automation is inactive for this event",
			},
		];
		mocks.execute.mockResolvedValue({
			skipped: true,
			persisted: false,
			diagnostics,
		});

		// Act
		const report = await new FeedbackAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			createJourney: (input) =>
				FeedbackComposition.createFeedbackContainer(input).get(
					ReconcileMeetupFeedback,
				),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		}).run(new GithubActionsComposition().actionMessages("en"));

		// Assert
		expect(report.details).toContain("feedback=skipped");
		expect(report.diagnostics).toEqual(diagnostics);
		expect(report.failure).toBeUndefined();
		expect(mocks.outputs).toEqual({});
		expect(mocks.outputs.diagnostics).toBeUndefined();
	});

	it("localizes reports and passes the resolved locale to composition", async () => {
		// Arrange
		const messages = new ActionMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			"fr-CA",
		);

		// Act
		const report = await new FeedbackAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			createJourney: (input) =>
				FeedbackComposition.createFeedbackContainer(input).get(
					ReconcileMeetupFeedback,
				),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		}).run(messages);

		// Assert
		expect(mocks.compose).toHaveBeenCalledWith(
			expect.objectContaining({ locale: "fr" }),
		);
		expect(report.details).toContain("issue=12 mode=fix");
		expect(report.details).toContain("issue_persisted=true");
		expect(report.details).toHaveLength(3);
		expect(report.diagnostics).toEqual([]);
	});

	it("masks and forwards the required OpenFeedback organization key", async () => {
		// Arrange
		mocks.inputs["openfeedback-api-key"] = "oforg_synthetic-secret";

		// Act
		await new FeedbackAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			createJourney: (input) =>
				FeedbackComposition.createFeedbackContainer(input).get(
					ReconcileMeetupFeedback,
				),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		}).run(new GithubActionsComposition().actionMessages("en"));

		// Assert
		expect(mocks.setSecret).toHaveBeenCalledWith("oforg_synthetic-secret");
		expect(mocks.compose).toHaveBeenCalledWith(
			expect.objectContaining({ openFeedbackApiKey: "oforg_synthetic-secret" }),
		);
		expect(JSON.stringify(mocks.outputs)).not.toContain(
			"oforg_synthetic-secret",
		);
	});

	it.each([undefined, "", "   "])(
		"rejects an absent or blank OpenFeedback key (%j) before requests",
		async (value) => {
			// Arrange
			if (value === undefined) delete mocks.inputs["openfeedback-api-key"];
			else mocks.inputs["openfeedback-api-key"] = value;

			// Act
			const operation = new FeedbackAction({
				publicationUrlInput:
					new GithubActionsComposition().publicationUrlInput(),
				createJourney: (input) =>
					FeedbackComposition.createFeedbackContainer(input).get(
						ReconcileMeetupFeedback,
					),
				runtimeInput: new GithubActionsComposition().runtimeInput(),
				conferenceHallInput:
					new GithubActionsComposition().conferenceHallInput(),
			}).run(new GithubActionsComposition().actionMessages("en"));

			// Assert
			await expect(operation).rejects.toThrow(
				"Input required and not supplied: openfeedback-api-key",
			);
			expect(mocks.getOctokit).not.toHaveBeenCalled();
			expect(mocks.compose).not.toHaveBeenCalled();
			expect(mocks.execute).not.toHaveBeenCalled();
			expect(mocks.outputs).toEqual({});
		},
	);
});
