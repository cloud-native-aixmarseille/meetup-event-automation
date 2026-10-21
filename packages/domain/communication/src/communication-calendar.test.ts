import { describe, expect, it } from "vitest";
import { CommunicationCalendar } from "./communication-calendar.js";

describe("communication civil dates", () => {
	it.each([
		["2026-03-28T22:30:00.000Z", { year: 2026, month: 3, day: 28 }],
		["2026-03-28T23:30:00.000Z", { year: 2026, month: 3, day: 29 }],
		["2026-10-25T00:30:00.000Z", { year: 2026, month: 10, day: 25 }],
		["2026-10-25T01:30:00.000Z", { year: 2026, month: 10, day: 25 }],
	] as const)(
		"resolves Paris civil date through daylight-saving changes: %s",
		(timestamp, expected) => {
			// Arrange
			const now = new Date(timestamp);

			// Act
			const date = new CommunicationCalendar().getLocalDate(
				now,
				"Europe/Paris",
			);

			// Assert
			expect(date).toEqual(expected);
		},
	);

	it.each(["2026-02-30", "2026-13-01", "08/06/2026"])(
		"rejects impossible or non-ISO event dates: %s",
		(value) => {
			// Arrange
			const input = value;

			// Act
			const date = new CommunicationCalendar().parseIsoLocalDate(input);

			// Assert
			expect(date).toBeUndefined();
		},
	);
});
