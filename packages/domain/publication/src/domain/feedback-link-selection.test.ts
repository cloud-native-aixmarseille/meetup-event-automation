import { describe, expect, it } from "vitest";
import { FeedbackLinkSelection } from "./feedback-link-selection.js";

describe("shared feedback link selection", () => {
	it.each([
		{
			date: "2026-09-30",
			target: "2026-09-30",
			now: "2026-09-29T10:00:00Z",
			expected: "ambiguous-date",
		},
		{
			date: "2026-09-29",
			target: "2026-09-30",
			now: "2026-09-29T10:00:00Z",
			expected: "current-event",
		},
		{
			date: "2026-09-29",
			target: "2026-09-30",
			now: "2026-09-30T10:00:00Z",
			expected: undefined,
		},
		{
			date: "2026-09-30",
			target: "2026-09-29",
			now: "2026-09-29T10:00:00Z",
			expected: undefined,
		},
	])(
		"selects the active event through the end of its civil date: $date vs $target",
		({ date, target, now, expected }) => {
			// Arrange
			const candidate = {
				date,
				isOpen: true,
				occurrenceStatus: "scheduled" as const,
			};

			// Act
			const conflict = FeedbackLinkSelection.conflict(
				candidate,
				target,
				now,
				"Europe/Paris",
			);

			// Assert
			expect(conflict).toBe(expected);
		},
	);

	it.each([
		{ isOpen: false },
		{ occurrenceStatus: "cancelled" as const },
		{ occurrenceStatus: "postponed" as const },
	])("ignores inactive events sharing the target date: %j", (inactive) => {
		// Arrange
		const candidate = {
			date: "2026-09-30",
			isOpen: true,
			occurrenceStatus: "scheduled" as const,
			...inactive,
		};

		// Act
		const conflict = FeedbackLinkSelection.conflict(
			candidate,
			"2026-09-30",
			"2026-09-29T10:00:00Z",
			"Europe/Paris",
		);

		// Assert
		expect(conflict).toBeUndefined();
	});
});
