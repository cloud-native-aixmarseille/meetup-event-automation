import { describe, expect, it } from "vitest";
import { identity } from "../../testing/meetup-journey.fixtures.js";
import { socialDestinations } from "../../testing/promotional-content.fixtures.js";
import { remindersFixture } from "../../testing/social-reminders.fixtures.js";
import { SocialReminderPlans } from "./social-reminder-plans.js";

describe("social reminder planning", () => {
	it("plans both milestones for each configured destination", async () => {
		// Arrange
		const f = await remindersFixture();
		// Act
		const targets = f.planner.targets(socialDestinations);
		// Assert
		expect(f.planner).toBeInstanceOf(SocialReminderPlans);
		expect(targets).toEqual([
			"slack-engineering:d7",
			"slack-engineering:d0",
			"linkedin:d7",
			"linkedin:d0",
		]);
	});
	it.each([
		["2026-10-20T12:00:00Z", "slack-engineering:d7", true],
		["2026-10-21T20:00:00Z", "slack-engineering:d7", true],
		["2026-10-21T22:00:00Z", "slack-engineering:d7", false],
		["2026-10-28T08:00:00Z", "slack-engineering:d0", true],
		["2026-10-28T17:45:00Z", "slack-engineering:d0", false],
	] as const)(
		"evaluates the preparation window at %s for %s",
		async (now, target, eligible) => {
			// Arrange
			const f = await remindersFixture();
			f.state.now = now;
			// Act
			const result = await f.planner.read(identity, target);
			// Assert
			expect(Boolean(result)).toBe(eligible);
		},
	);
	it.each(["inactive", "unpublished"])(
		"does not prepare reminders for an %s event",
		async (reason) => {
			// Arrange
			const f = await remindersFixture();
			f.state.active = reason !== "inactive";
			f.state.published = reason !== "unpublished";
			// Act
			const result = await f.planner.read(identity, "slack-engineering:d0");
			// Assert
			expect(result).toBeUndefined();
		},
	);
});
