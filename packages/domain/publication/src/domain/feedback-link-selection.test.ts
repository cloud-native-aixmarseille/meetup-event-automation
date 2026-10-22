import { describe, expect, it } from "vitest";
import { PublicationDomainComposition } from "../dependency-composition.js";
import { FeedbackLinkSelection } from "./feedback-link-selection.js";

const active = {
	date: "2026-09-30",
	isOpen: true,
	occurrenceStatus: "scheduled" as const,
};

describe("shared feedback link selection", () => {
	it.each([
		{
			dates: ["2026-10-01", "2026-09-30"],
			now: "2026-09-30T10:00:00Z",
			expected: { index: 1 },
		},
		{
			dates: ["2026-09-30", "2026-10-01"],
			now: "2026-09-30T10:00:00Z",
			expected: { index: 0 },
		},
		{
			dates: ["2026-09-30", "2026-10-01"],
			now: "2026-09-30T22:00:00Z",
			expected: { index: 1 },
		},
		{
			dates: ["2026-09-30", "2026-09-30"],
			now: "2026-09-29T10:00:00Z",
			expected: { conflict: "ambiguous-date" },
		},
		{ dates: ["2026-09-30"], now: "2026-09-28T21:59:59Z", expected: {} },
		{
			dates: ["2026-09-30"],
			now: "2026-09-28T22:00:00Z",
			expected: { index: 0 },
		},
		{ dates: ["invalid"], now: "2026-09-30T10:00:00Z", expected: {} },
		{ dates: [], now: "2026-09-30T10:00:00Z", expected: {} },
	])(
		"selects a unique destination by local date: %j",
		({ dates, now, expected }) => {
			// Arrange
			const candidates = dates.map((date) => ({ ...active, date }));
			const selection = new FeedbackLinkSelection({
				feedbackPolicy: new PublicationDomainComposition().feedbackPolicy(),
			});
			// Act
			const result = selection.select(candidates, now, "Europe/Paris");
			// Assert
			expect(result).toEqual(expected);
		},
	);
	it.each([
		{ isOpen: false },
		{ occurrenceStatus: "cancelled" as const },
		{ occurrenceStatus: "postponed" as const },
	])("ignores inactive events sharing the selected date: %j", (inactive) => {
		// Arrange
		const selection = new FeedbackLinkSelection({
			feedbackPolicy: new PublicationDomainComposition().feedbackPolicy(),
		});
		const candidates = [{ ...active, ...inactive }, active];
		// Act
		const result = selection.select(
			candidates,
			"2026-09-29T10:00:00Z",
			"Europe/Paris",
		);
		// Assert
		expect(result).toEqual({ index: 1 });
	});
});
