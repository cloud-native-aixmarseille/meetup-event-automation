import { describe, expect, it } from "vitest";
import { FeedbackPolicy } from "./feedback-policy.js";

describe("feedback eligibility", () => {
	it.each([
		"2026-09-28T22:00:00Z",
		"2026-09-29T21:59:59Z",
		"2026-09-29T22:00:00Z",
		"2026-09-30T10:00:00Z",
		"2026-09-30T21:59:59Z",
	])(
		"updates from the previous Paris day through the event day at %s",
		(now) => {
			// Arrange
			const date = "2026-09-30";

			// Act
			const result = new FeedbackPolicy().isLinkUpdateDue(
				date,
				now,
				"Europe/Paris",
			);

			// Assert
			expect(result).toBe(true);
		},
	);

	it.each([
		"2026-09-28T21:59:59Z",
		"2026-09-30T22:00:00Z",
		"2026-10-01T10:00:00Z",
	])(
		"does not update before the window or after the event day at %s",
		(now) => {
			// Arrange
			const date = "2026-09-30";

			// Act
			const result = new FeedbackPolicy().isLinkUpdateDue(
				date,
				now,
				"Europe/Paris",
			);

			// Assert
			expect(result).toBe(false);
		},
	);

	it.each([
		{ date: "2026-10-01", now: "2026-09-30T10:00:00Z" },
		{ date: "2027-01-01", now: "2026-12-31T10:00:00Z" },
		{ date: "2028-03-01", now: "2028-02-29T10:00:00Z" },
		{ date: "2027-03-01", now: "2027-02-28T10:00:00Z" },
	])("handles calendar boundaries before $date", ({ date, now }) => {
		// Arrange
		const timeZone = "Europe/Paris";

		// Act
		const result = new FeedbackPolicy().isLinkUpdateDue(date, now, timeZone);

		// Assert
		expect(result).toBe(true);
	});

	it.each([
		{ date: "2026-03-30", now: "2026-03-28T22:59:59Z", expected: false },
		{ date: "2026-03-30", now: "2026-03-28T23:00:00Z", expected: true },
		{ date: "2026-03-30", now: "2026-03-29T21:59:59Z", expected: true },
		{ date: "2026-03-30", now: "2026-03-29T22:00:00Z", expected: true },
		{ date: "2026-03-30", now: "2026-03-30T21:59:59Z", expected: true },
		{ date: "2026-03-30", now: "2026-03-30T22:00:00Z", expected: false },
		{ date: "2026-10-26", now: "2026-10-24T21:59:59Z", expected: false },
		{ date: "2026-10-26", now: "2026-10-24T22:00:00Z", expected: true },
		{ date: "2026-10-26", now: "2026-10-25T22:59:59Z", expected: true },
		{ date: "2026-10-26", now: "2026-10-25T23:00:00Z", expected: true },
		{ date: "2026-10-26", now: "2026-10-26T22:59:59Z", expected: true },
		{ date: "2026-10-26", now: "2026-10-26T23:00:00Z", expected: false },
	])(
		"uses calendar days across daylight saving changes at $now",
		({ date, now, expected }) => {
			// Arrange
			const timeZone = "Europe/Paris";

			// Act
			const result = new FeedbackPolicy().isLinkUpdateDue(date, now, timeZone);

			// Assert
			expect(result).toBe(expected);
		},
	);

	it.each(["invalid", "2027-02-29"])(
		"does not update for an invalid event date: %s",
		(date) => {
			// Arrange
			const now = "2027-02-28T10:00:00Z";

			// Act
			const result = new FeedbackPolicy().isLinkUpdateDue(
				date,
				now,
				"Europe/Paris",
			);

			// Assert
			expect(result).toBe(false);
		},
	);

	it.each([
		"https://evil.test/poll",
		"http://openfeedback.io/poll",
		"https://openfeedback.io.evil.test/poll",
		"https://user@openfeedback.io/poll",
		"https://openfeedback.io/poll?redirect=evil",
		"https://openfeedback.io/poll/session",
		"https://openfeedback.io/",
	])("rejects unsafe or non-event URLs: %s", (url) => {
		// Arrange
		// Use the supplied URL.

		// Act
		const parse = () => new FeedbackPolicy().pollUrl(url);

		// Assert
		expect(parse).toThrow();
	});
});

it.each([
	"https://openfeedback.io/example/",
	"https://openfeedback.io/example/2026-09-30",
	"https://openfeedback.io/example/0",
])("accepts event links and the public date selector: %s", (url) => {
	// Arrange
	const expected = url.replace(/\/$/, "");

	// Act
	const result = new FeedbackPolicy().pollUrl(url);

	// Assert
	expect(result).toBe(expected);
});

it.each([
	{ value: "2028-02-29", valid: true },
	{ value: "2027-02-29", valid: false },
	{ value: "invalid", valid: false },
])("validates calendar dates: $value", ({ value, valid }) => {
	// Arrange
	// Use the supplied calendar date.

	// Act
	const result = new FeedbackPolicy().validDate(value);

	// Assert
	expect(result).toBe(valid);
});
