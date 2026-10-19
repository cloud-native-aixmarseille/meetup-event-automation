import { describe, expect, it } from "vitest";
import { SocialPostTiming } from "./social-post-timing.js";

describe("reminder timing", () => {
	it("subtracts calendar days across a daylight-saving transition", () => {
		// Arrange
		const timing = new SocialPostTiming();
		// Act
		const planned = timing.plannedAt(
			"d7",
			"2026-10-28",
			"09:00",
			"Europe/Paris",
			"18:45",
		);
		// Assert
		expect(planned).toBe("2026-10-21T07:00:00.000Z");
	});
	it.each(["2026-03-29", "2026-10-25"])(
		"rejects nonexistent or ambiguous local hours on %s",
		(date) => {
			// Arrange
			const timing = new SocialPostTiming();
			// Act
			const convert = () => timing.instant(date, "02:30", "Europe/Paris");
			// Assert
			expect(convert).toThrow("Ambiguous or nonexistent");
		},
	);
	it.each([
		["2026-10-21T06:59:59Z", false],
		["2026-10-21T07:00:00Z", true],
		["2026-10-22T07:00:00Z", false],
		["2026-10-28T17:45:00Z", false],
	] as const)("evaluates the due window at %s", (now, expected) => {
		// Arrange
		const plan = {
			facts: {
				date: "2026-10-28",
				startTime: "18:45",
				timeZone: "Europe/Paris",
			},
			plannedAt: "2026-10-21T07:00:00Z",
		};
		const timing = new SocialPostTiming();
		// Act
		const eligible = timing.publicationEligible(plan, now);
		// Assert
		expect(eligible).toBe(expected);
	});
});
