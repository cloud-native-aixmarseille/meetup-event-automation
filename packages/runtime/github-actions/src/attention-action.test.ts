import * as core from "@actions/core";
import { ManageMeetupAttention } from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicationUrlInputs } from "../testing/publication-urls.fixtures.js";
import { AttentionAction } from "./attention-action.js";
import { AttentionComposition } from "./attention-composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { ActionMessages } from "./i18n/action-messages.js";

const boundary = vi.hoisted(() => ({ execute: vi.fn(), feedback: vi.fn() }));
vi.mock("@actions/core", () => ({
	getInput: (name: string) =>
		({
			...publicationUrlInputs,
			"issue-number": "42",
			"github-token": "private-token",
			"managed-comment-author": "automation[bot]",
			"slack-token": "private-slack",
			"slack-organizer-channel-id": "C123",
			"stage-results": "{}",
		})[name],
	setOutput: vi.fn(),
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "example", repo: "meetups" }, runId: 123 },
	getOctokit: () => ({}),
}));
vi.mock("./attention-composition.js", () => ({
	AttentionComposition: {
		create: () => ({
			get: (service: { name: string }) => ({
				execute:
					service.name === "OrganizerFeedback"
						? boundary.feedback
						: boundary.execute,
			}),
		}),
	},
}));
describe("attention action reporting", () => {
	beforeEach(() => vi.clearAllMocks());
	it.each([true, false])(
		"reports notification failure %s through the shared runner contract",
		async (notificationFailed) => {
			// Arrange
			boundary.execute.mockResolvedValue({
				active: 2,
				posted: false,
				skipped: false,
				notificationFailed,
			});

			// Act
			const report = await new AttentionAction({
				publicationUrlInput:
					new GithubActionsComposition().publicationUrlInput(),
				createAttention: (input) => {
					const container = AttentionComposition.create(input);
					return container.get(ManageMeetupAttention);
				},
				runtimeInput: new GithubActionsComposition().runtimeInput(),
				attentionStages: new GithubActionsComposition().attentionStages(),
			}).run(
				new ActionMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					"fr",
				),
			);

			// Assert
			expect(Boolean(report.failure)).toBe(notificationFailed);
			expect(report.details.join(" ")).toContain("attention=persisted");
			expect(core.setOutput).not.toHaveBeenCalled();

			expect(JSON.stringify(report)).not.toContain("private");
		},
	);
	it("explains skipped issues", async () => {
		// Arrange
		boundary.execute.mockResolvedValue({
			active: 0,
			posted: false,
			skipped: true,
			notificationFailed: false,
		});

		// Act
		const report = await new AttentionAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			createAttention: (input) => {
				const container = AttentionComposition.create(input);
				return container.get(ManageMeetupAttention);
			},
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			attentionStages: new GithubActionsComposition().attentionStages(),
		}).run(new GithubActionsComposition().actionMessages("en"));

		// Assert
		expect(report.details.join(" ")).toContain("skipped");
		expect(report.failure).toBeUndefined();
	});
});
