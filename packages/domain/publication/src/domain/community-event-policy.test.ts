import { describe, expect, it } from "vitest";
import { communityEvent } from "../../testing/community-event.fixture.js";
import { CommunityEventPolicy } from "./community-event-policy.js";
import { ScheduledEventPolicy } from "./scheduled-event-policy.js";

describe("community event prerequisites", () => {
	it("accepts the OCGroups title limit independently of Meetup", () => {
		// Arrange
		const policy = new CommunityEventPolicy(new ScheduledEventPolicy());
		const event = { ...communityEvent, title: "x".repeat(120) };
		// Act
		const valid = policy.valid(event, "2099-11-01T00:00:00Z");
		// Assert
		expect(valid).toBe(true);
	});
	it.each([
		{ title: "x".repeat(121) },
		{ description: "x".repeat(8001) },
		{ description: "Bad\u0000text" },
		{ date: "2026-10-25", startTime: "02:30", endTime: "04:30" },
		{ date: "2027-03-28", startTime: "02:30", endTime: "04:30" },
		{ timeZone: "unknown" },
		{ categoryId: "unknown" },
		{ venue: { ...communityEvent.venue, countryCode: "fr" } },
		{ registration: { ...communityEvent.registration, capacity: 0 } },
		{
			registration: { ...communityEvent.registration, approvalRequired: true },
		},
	])(
		"rejects invalid provider fields or ambiguous local schedules: %j",
		(changes) => {
			// Arrange
			const policy = new CommunityEventPolicy(new ScheduledEventPolicy());
			const event = { ...communityEvent, ...changes };
			// Act
			const valid = policy.valid(event, "2026-01-01T00:00:00Z");
			// Assert
			expect(valid).toBe(false);
		},
	);
});
