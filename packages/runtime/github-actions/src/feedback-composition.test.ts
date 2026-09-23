import { getOctokit } from "@actions/github";
import type { EventRepository } from "@meetup-automation/event";
import { ManageMeetupFeedback } from "@meetup-automation/journey";
import { describe, expect, it, vi } from "vitest";
import { SERVICES } from "./composition.js";
import { FEEDBACK_LINKS, FeedbackComposition } from "./feedback-composition.js";

describe("feedback composition", () => {
	it("allows replacing Kutt before resolving the journey", async () => {
		// Arrange
		const identity = { repository: "example/meetups", issueNumber: 12 };
		const container = FeedbackComposition.createFeedbackContainer({
			client: getOctokit("synthetic-token"),
			owner: "example",
			repo: "meetups",
			commentAuthorLogin: "example[bot]",
			workspaceRoot: "/must-not-read",
			kuttApiKey: "synthetic-key",
			kuttLinkId: "link-1",
		});
		const links = { updateTarget: vi.fn() };
		container.rebind(FEEDBACK_LINKS).toConstantValue(links);
		container
			.rebind<EventRepository>(SERVICES.eventRepository)
			.toConstantValue({
				find: vi.fn().mockResolvedValue({
					identity,
					issueTitle: "Unrelated",
					issueState: "open",
					body: "",
					labels: [],
				}),
				applyPatch: vi.fn(),
				listPage: vi.fn(),
			});

		// Act
		const result = await container
			.get(ManageMeetupFeedback)
			.execute({ identity, mode: "fix" });

		// Assert
		expect(result.skipped).toBe(true);
		expect(links.updateTarget).not.toHaveBeenCalled();
	});
});
