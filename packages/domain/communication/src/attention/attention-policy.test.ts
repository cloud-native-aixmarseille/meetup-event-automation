import { describe, expect, it } from "vitest";
import { condition } from "../../testing/attention.fixtures.js";
import { AttentionPolicy } from "./attention-policy.js";
import type { AttentionEpisode } from "./model.js";
describe("attention reminder policy", () => {
	it.each([
		["2099-05-31T10:00:00Z", undefined],
		["2099-06-01T10:00:00Z", "preparation:7"],
		["2099-06-05T10:00:00Z", "preparation:3"],
		["2099-06-07T10:00:00Z", "preparation:1"],
		["2099-06-08T10:00:00Z", "preparation:0"],
		["2099-06-09T10:00:00Z", undefined],
	])(
		"selects only the current preparation milestone at %s",
		(instant, expected) => {
			// Arrange
			const episode: AttentionEpisode = {
				condition: condition(),
				episode: 1,
				openedAt: "2099-05-01T10:00:00Z",
				status: "active",
			};
			// Act
			const window = AttentionPolicy.window(
				episode,
				"2099-06-08",
				new Date(instant),
			);
			// Assert
			expect(window).toBe(expected);
		},
	);
	it.each([
		["2026-03-28T23:30:00Z", "2026-03-29T21:59:00Z", true],
		["2026-03-29T21:59:00Z", "2026-03-29T22:00:00Z", false],
		["2026-10-24T22:30:00Z", "2026-10-25T22:59:00Z", true],
	])("uses Paris calendar days across DST (%s)", (first, second, same) => {
		// Arrange
		const before = new Date(first);
		const after = new Date(second);
		// Act
		const equal = AttentionPolicy.day(before) === AttentionPolicy.day(after);
		// Assert
		expect(equal).toBe(same);
	});
	it.each([23, 24, 25])(
		"waits 24 elapsed hours before approval reminders (%s)",
		(hours) => {
			// Arrange
			const openedAt = "2099-06-01T10:00:00Z";
			const episode: AttentionEpisode = {
				condition: condition({ policy: "approval", since: openedAt }),
				episode: 1,
				openedAt,
				status: "active",
			};
			// Act
			const window = AttentionPolicy.window(
				episode,
				"2099-06-08",
				new Date(Date.parse(openedAt) + hours * 3_600_000),
			);
			// Assert
			expect(window !== undefined).toBe(hours >= 24);
		},
	);
	it.each(["occurrence", "follow-up"] as const)(
		"reminds at the first eligible audit and after seven days for %s",
		(policy) => {
			// Arrange
			const episode: AttentionEpisode = {
				condition: condition({ policy }),
				episode: 1,
				openedAt: "2099-06-01T10:00:00Z",
				status: "active",
			};
			// Act
			const windows = [8, 9, 12, 15].map((day) =>
				AttentionPolicy.window(
					episode,
					"2099-06-08",
					new Date(`2099-06-${day.toString().padStart(2, "0")}T10:00:00Z`),
				),
			);
			// Assert
			expect(windows).toEqual([
				undefined,
				`${policy}:1`,
				`${policy}:1`,
				`${policy}:7`,
			]);
		},
	);
});
