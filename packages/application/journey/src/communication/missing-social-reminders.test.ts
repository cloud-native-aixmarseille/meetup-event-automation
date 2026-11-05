import { describe, expect, it } from "vitest";
import { identity } from "../../testing/meetup-journey.fixtures.js";
import { socialDestinations } from "../../testing/promotional-content.fixtures.js";
import { remindersFixture } from "../../testing/social-reminders.fixtures.js";
import { MissingSocialReminders } from "./missing-social-reminders.js";

describe("missing social reminder feedback", () => {
	it("reports each applicable reminder when there are no proposals", async () => {
		// Arrange
		const f = await remindersFixture();
		f.state.now = "2026-10-28T10:00:00Z";
		const subject = new MissingSocialReminders(f.planner);
		// Act
		const result = await subject.evaluate(
			identity,
			socialDestinations,
			new Map(),
		);
		// Assert
		expect(result.map((r) => r.target)).toEqual([
			"slack-engineering:d0",
			"linkedin:d0",
		]);
		expect(result.every((r) => r.status === "missing")).toBe(true);
		expect(result[0].diagnostics[0]).toMatchObject({
			code: "communication.social.missing",
			field: "social.slack-engineering.d0",
		});
	});
	it("keeps existing proposals out of missing-draft feedback", async () => {
		// Arrange
		const f = await remindersFixture();
		f.state.now = "2026-10-28T10:00:00Z";
		const subject = new MissingSocialReminders(f.planner);
		// Act
		const result = await subject.evaluate(
			identity,
			[socialDestinations[0]],
			new Map([[f.proposal.plan.target, f.proposal]]),
		);
		// Assert
		expect(result).toEqual([]);
	});
	it("does not use a previous occurrence's draft to cover a rescheduled reminder", async () => {
		// Arrange
		const f = await remindersFixture();
		f.state.now = "2026-10-28T10:00:00Z";
		const old = {
			...f.proposal,
			plan: {
				...f.proposal.plan,
				facts: { ...f.proposal.plan.facts, date: "2026-10-27" },
			},
		};
		const subject = new MissingSocialReminders(f.planner);
		// Act
		const result = await subject.evaluate(
			identity,
			[socialDestinations[0]],
			new Map([[old.plan.target, old]]),
		);
		// Assert
		expect(result).toHaveLength(1);
		expect(result[0].occurrence).toBe("2026-10-28");
	});
	it("does not report reminders once their sending windows close", async () => {
		// Arrange
		const f = await remindersFixture();
		f.state.now = "2026-10-28T17:45:00Z";
		const subject = new MissingSocialReminders(f.planner);
		// Act
		const result = await subject.evaluate(
			identity,
			socialDestinations,
			new Map(),
		);
		// Assert
		expect(result).toEqual([]);
	});
});
