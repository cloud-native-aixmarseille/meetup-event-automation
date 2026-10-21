import { describe, expect, it } from "vitest";
import type { ScheduledEvent } from "../application/scheduled-event-ports.js";
import { ScheduledEventPolicy } from "./scheduled-event-policy.js";

const event: ScheduledEvent = {
	title: "Example evening",
	description: "Public event description",
	date: "2026-10-01",
	startTime: "18:45",
	endTime: "20:45",
	timeZone: "Europe/Paris",
	venue: { name: "Example Venue", city: "Example City" },
};

describe("scheduled event validation", () => {
	it.each(["2026-10-25", "2027-03-28"])(
		"rejects ambiguous or nonexistent local times on %s",
		(date) => {
			// Arrange
			const input = { ...event, date, startTime: "02:30", endTime: "04:30" };

			// Act
			const result = new ScheduledEventPolicy().valid(
				input,
				"2026-09-01T10:00:00Z",
			);

			// Assert
			expect(result).toBe(false);
		},
	);
	it.each([
		{ date: "2026-02-30" },
		{ date: "tomorrow" },
		{ title: "" },
		{ title: "x".repeat(81) },
		{ description: "" },
		{ description: "x".repeat(49_001) },
		{ startTime: "25:00" },
		{ endTime: "12:60" },
		{ endTime: "18:45" },
		{ endTime: "01:00" },
		{ timeZone: "invalid" },
		{ venue: { name: "", city: "City" } },
	] satisfies Partial<ScheduledEvent>[])(
		"rejects invalid publication fields %j",
		(overrides) => {
			// Arrange
			const input = { ...event, ...overrides };

			// Act
			const result = new ScheduledEventPolicy().valid(
				input,
				"2026-09-01T10:00:00Z",
			);

			// Assert
			expect(result).toBe(false);
		},
	);

	it.each([
		["2026-10-01T16:44:00Z", true],
		["2026-10-01T16:45:00Z", false],
		["2026-10-01T17:00:00Z", false],
		["invalid", false],
	] as const)(
		"compares future start with the configured time zone at %s",
		(now, expected) => {
			// Arrange
			const input = { ...event };

			// Act
			const result = new ScheduledEventPolicy().valid(input, now);

			// Assert
			expect(result).toBe(expected);
		},
	);
});
