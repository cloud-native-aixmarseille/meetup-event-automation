import { describe, expect, it, vi } from "vitest";
import { CommunicationDomainComposition } from "./dependency-composition.js";
import { PostEventPolicy } from "./post-event-policy.js";

describe("post-event eligibility", () => {
	it.each([
		{ eventDate: "2099-02-30" },
		{ eventDate: "" },
		{ now: new Date("invalid") },
		{ timeZone: "invalid-zone" },
	])("rejects invalid scheduling context %j", (override) => {
		// Arrange
		const input = {
			eventDate: "2099-06-08",
			timeZone: "Europe/Paris",
			occurrenceStatus: "held" as const,
			now: new Date("2099-06-09T10:00:00Z"),
			...override,
		};

		// Act
		const due = new PostEventPolicy({
			communicationCalendar:
				new CommunicationDomainComposition().communicationCalendar(),
		}).isDue(input);

		// Assert
		expect(due).toBe(false);
	});
	it("retains an explicit held decision before the scheduled date", () => {
		// Arrange
		const input = {
			eventDate: "2099-06-08",
			timeZone: "Europe/Paris",
			occurrenceStatus: "held" as const,
			now: new Date("2099-06-01T10:00:00Z"),
		};

		// Act
		const due = new PostEventPolicy({
			communicationCalendar:
				new CommunicationDomainComposition().communicationCalendar(),
		}).isDue(input);

		// Assert
		expect(due).toBe(true);
	});
	it.each([
		["2099-06-08T21:59:59Z", false],
		["2099-06-08T22:00:00Z", true],
		["2099-06-09T10:00:00Z", true],
	])("uses the Paris calendar day at %s", (instant, expected) => {
		// Arrange
		const input = {
			eventDate: "2099-06-08",
			timeZone: "Europe/Paris",
			occurrenceStatus: "scheduled" as const,
			now: new Date(instant),
		};

		// Act
		const due = new PostEventPolicy({
			communicationCalendar:
				new CommunicationDomainComposition().communicationCalendar(),
		}).isDue(input);

		// Assert
		expect(due).toBe(expected);
	});

	it.each(["cancelled", "postponed", "unknown"] as const)(
		"excludes %s events even after their date",
		(occurrenceStatus) => {
			// Arrange
			const input = {
				eventDate: "2099-06-08",
				timeZone: "Europe/Paris",
				occurrenceStatus,
				now: new Date("2099-06-09T10:00:00Z"),
			};

			// Act
			const due = new PostEventPolicy({
				communicationCalendar:
					new CommunicationDomainComposition().communicationCalendar(),
			}).isDue(input);

			// Assert
			expect(due).toBe(false);
		},
	);
});

it("uses the supplied calendar independently for each policy instance", () => {
	// Arrange
	const calendar = new CommunicationDomainComposition().communicationCalendar();
	const unavailableDate = vi.fn().mockReturnValue(undefined);
	const blocked = new PostEventPolicy({
		communicationCalendar: {
			isValidInstant: calendar.isValidInstant.bind(calendar),
			parseIsoLocalDate: calendar.parseIsoLocalDate.bind(calendar),
			getLocalDate: unavailableDate,
			toEpochDay: calendar.toEpochDay.bind(calendar),
		},
	});
	const available = new PostEventPolicy({ communicationCalendar: calendar });
	const input = {
		eventDate: "2099-06-08",
		timeZone: "UTC",
		occurrenceStatus: "held" as const,
		now: new Date("2099-06-09T12:00:00Z"),
	};

	// Act
	const blockedResult = blocked.isDue(input);
	const availableResult = available.isDue(input);

	// Assert
	expect(blockedResult).toBe(false);
	expect(availableResult).toBe(true);
	expect(unavailableDate).toHaveBeenCalledExactlyOnceWith(
		input.now,
		input.timeZone,
	);
});
