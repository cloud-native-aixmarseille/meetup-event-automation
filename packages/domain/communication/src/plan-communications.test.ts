import { describe, expect, it } from "vitest";
import { MAIL_TEMPLATE_NAMES, type PlanCommunicationsInput } from "./model.js";
import { PlanCommunications } from "./plan-communications.js";

const planner = new PlanCommunications();

function baseInput(
	override: Partial<PlanCommunicationsInput> = {},
): PlanCommunicationsInput {
	return {
		repositoryId: "cloud-native-aixmarseille/meetups",
		eventId: "issue:123",
		eventDate: "2026-06-08",
		timeZone: "Europe/Paris",
		readiness: "ready",
		occurrenceStatus: "scheduled",
		policyVersion: "communication-v2",
		readinessWindowDays: 7,
		mailRecipients: [mailRecipient("host-1", "hosting", "host@example.test")],
		notificationRecipients: [notificationRecipient()],
		mailPlaceholders: { eventTitle: "A meetup" },
		notificationContent: "The meetup is not ready",
		now: new Date("2026-06-01T10:00:00.000Z"),
		...override,
	};
}

function readyInput(
	override: Partial<PlanCommunicationsInput> = {},
): PlanCommunicationsInput {
	return baseInput({ readiness: "ready", ...override });
}

function notReadyInput(
	override: Partial<PlanCommunicationsInput> = {},
): PlanCommunicationsInput {
	return baseInput({
		readiness: "not-ready",
		mailRecipients: [],
		...override,
	});
}

function mailRecipient(
	recipientId: string,
	role: "hosting" | "speaker",
	email: string,
	receivesCommunications = true,
) {
	return {
		channel: "mail" as const,
		recipientId,
		role,
		email,
		receivesCommunications,
	};
}

function notificationRecipient(receivesCommunications = true) {
	return {
		channel: "notification" as const,
		recipientId: "organizers-slack",
		role: "organizers" as const,
		destination: "slack-channel-id",
		receivesCommunications,
	};
}

describe("PlanCommunications", () => {
	it("plans host and speaker introductions only for opted-in recipients when ready", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = planner.execute(
			readyInput({
				mailRecipients: [
					mailRecipient("host-1", "hosting", "host@example.test"),
					mailRecipient("speaker-1", "speaker", "speaker@example.test"),
					mailRecipient(
						"speaker-0002",
						"speaker",
						"private@example.test",
						false,
					),
				],
			}),
		);

		// Assert
		expect(result.diagnostics).toEqual([]);
		expect(result.intents).toHaveLength(2);
		expect(result.intents).toEqual([
			expect.objectContaining({
				channel: "mail",
				kind: "host-introduction",
				templateName: MAIL_TEMPLATE_NAMES.hostIntroduction,
			}),
			expect.objectContaining({
				channel: "mail",
				kind: "speaker-introduction",
				templateName: MAIL_TEMPLATE_NAMES.speakerIntroduction,
			}),
		]);
	});

	it("merges event and recipient placeholders without putting either in the key", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = planner.execute(
			readyInput({
				mailPlaceholders: { eventTitle: "A meetup" },
				mailRecipients: [
					{
						...mailRecipient("host-1", "hosting", "host@example.test"),
						placeholders: { contactName: "Private Person" },
					},
				],
			}),
		);
		const [intent] = result.intents;

		// Assert
		expect(intent).toMatchObject({
			placeholders: {
				eventTitle: "A meetup",
				contactName: "Private Person",
			},
		});
		expect(intent?.idempotencyKey).not.toContain("host@example.test");
		expect(intent?.idempotencyKey).not.toContain("Private Person");
	});

	it("keeps idempotency stable when contact data changes", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const first = planner.execute(
			readyInput({
				mailRecipients: [
					mailRecipient("host-1", "hosting", "old@example.test"),
				],
			}),
		);
		const second = planner.execute(
			readyInput({
				mailRecipients: [
					mailRecipient("host-1", "hosting", "new@example.test"),
				],
			}),
		);

		// Assert
		expect(first.intents[0]?.idempotencyKey).toBe(
			second.intents[0]?.idempotencyKey,
		);
	});

	it.each([
		["2026-06-08T10:00:00.000Z", "2026-06-08"],
		["2026-06-01T10:00:00.000Z", "2026-06-08"],
	] as const)(
		"plans reminders at inclusive window boundary %s",
		(now, eventDate) => {
			// Arrange
			const input = notReadyInput({ now: new Date(now), eventDate });

			// Act
			const result = planner.execute(input);

			// Assert
			expect(result.intents).toEqual([
				expect.objectContaining({
					channel: "notification",
					kind: "readiness-reminder",
					content: "The meetup is not ready",
				}),
			]);
		},
	);

	it.each([
		["before the window", "2026-05-31T10:00:00.000Z", "2026-06-08"],
		["after the event", "2026-06-09T10:00:00.000Z", "2026-06-08"],
	])("does not plan a reminder %s", (_label, now, eventDate) => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = planner.execute(
			notReadyInput({ now: new Date(now), eventDate }),
		);

		// Assert
		expect(result.intents).toEqual([]);
	});

	it("uses the Europe/Paris civil date across the spring DST transition", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const beforeLocalMidnight = planner.execute(
			notReadyInput({
				eventDate: "2026-03-29",
				now: new Date("2026-03-28T22:30:00.000Z"),
				readinessWindowDays: 0,
			}),
		);
		const afterLocalMidnight = planner.execute(
			notReadyInput({
				eventDate: "2026-03-29",
				now: new Date("2026-03-28T23:30:00.000Z"),
				readinessWindowDays: 0,
			}),
		);

		// Assert
		expect(beforeLocalMidnight.intents).toHaveLength(0);
		expect(afterLocalMidnight.intents).toHaveLength(1);
	});

	it("uses civil days and remains stable through the repeated fall DST hour", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const summerOffsetOccurrence = planner.execute(
			notReadyInput({
				eventDate: "2026-11-01",
				now: new Date("2026-10-25T00:30:00.000Z"),
			}),
		);
		const winterOffsetOccurrence = planner.execute(
			notReadyInput({
				eventDate: "2026-11-01",
				now: new Date("2026-10-25T01:30:00.000Z"),
			}),
		);

		// Assert
		expect(summerOffsetOccurrence.intents).toHaveLength(1);
		expect(winterOffsetOccurrence.intents).toHaveLength(1);
		expect(summerOffsetOccurrence.intents[0]?.idempotencyKey).toBe(
			winterOffsetOccurrence.intents[0]?.idempotencyKey,
		);
	});

	it("plans thanks only from an explicit held state", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const held = planner.execute(
			baseInput({
				eventDate: "2030-01-01",
				occurrenceStatus: "held",
				readiness: "not-ready",
				mailRecipients: [
					mailRecipient("host-1", "hosting", "host@example.test"),
					mailRecipient("speaker-1", "speaker", "speaker@example.test"),
				],
			}),
		);
		const merelyPast = planner.execute(
			baseInput({
				eventDate: "2025-01-01",
				occurrenceStatus: "scheduled",
				readiness: "ready",
			}),
		);

		// Assert
		expect(held.intents).toEqual([
			expect.objectContaining({
				kind: "host-thanks",
				templateName: MAIL_TEMPLATE_NAMES.hostThanks,
			}),
			expect.objectContaining({
				kind: "speaker-thanks",
				templateName: MAIL_TEMPLATE_NAMES.speakerThanks,
			}),
		]);
		expect(held.intents).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ kind: "readiness-reminder" }),
			]),
		);
		expect(merelyPast.intents).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ kind: "host-thanks" }),
			]),
		);
		expect(merelyPast.intents).toEqual([]);
	});

	it("does not introduce a ready event whose scheduled date has elapsed", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = planner.execute(
			readyInput({
				eventDate: "2026-05-31",
				now: new Date("2026-06-01T10:00:00.000Z"),
			}),
		);

		// Assert
		expect(result).toEqual({ intents: [], diagnostics: [] });
	});

	it.each(["cancelled", "postponed", "unknown"] as const)(
		"does not plan side effects for %s occurrence status",
		(occurrenceStatus) => {
			// Arrange
			// No additional setup is needed.

			// Act
			const result = planner.execute(baseInput({ occurrenceStatus }));

			// Assert
			expect(result.intents).toEqual([]);
			expect(result.diagnostics).toEqual(
				occurrenceStatus === "unknown"
					? [{ code: "occurrence-status-unknown", severity: "warning" }]
					: [],
			);
		},
	);

	it("deduplicates identical stable recipients", () => {
		// Arrange
		const recipient = mailRecipient(
			"speaker-1",
			"speaker",
			"speaker@example.test",
		);

		// Act
		const result = planner.execute(
			readyInput({ mailRecipients: [recipient, recipient] }),
		);

		// Assert
		expect(result.intents).toHaveLength(1);
		expect(result.diagnostics).toEqual([
			expect.objectContaining({
				code: "duplicate-intent",
				severity: "warning",
			}),
		]);
	});

	it("fails closed when stable identifiers or the explicit instant are invalid", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const invalidIdentifier = planner.execute(
			readyInput({ eventId: "organizer@example.test" }),
		);
		const invalidClock = planner.execute(
			readyInput({ now: new Date("invalid") }),
		);

		// Assert
		expect(invalidIdentifier).toEqual({
			intents: [],
			diagnostics: [{ code: "invalid-identifier", severity: "error" }],
		});
		expect(invalidClock).toEqual({
			intents: [],
			diagnostics: [{ code: "invalid-clock", severity: "error" }],
		});
	});

	it("skips invalid mail recipients without disclosing contact data", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = planner.execute(
			readyInput({
				mailRecipients: [
					mailRecipient(
						"private@example.test",
						"hosting",
						"private@example.test",
					),
					mailRecipient("host-2", "hosting", "   "),
				],
			}),
		);
		const actual = JSON.stringify(result);

		// Assert
		expect(result.intents).toEqual([]);
		expect(result.diagnostics).toEqual([
			{ code: "invalid-identifier", severity: "error" },
			{ code: "missing-mail-destination", severity: "error" },
		]);
		expect(actual).not.toContain("private@example.test");
	});

	it("skips opted-out and invalid notification recipients", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = planner.execute(
			notReadyInput({
				notificationRecipients: [
					notificationRecipient(false),
					{
						...notificationRecipient(),
						recipientId: "private@example.test",
					},
				],
			}),
		);

		// Assert
		expect(result.intents).toEqual([]);
		expect(result.diagnostics).toEqual([
			{ code: "invalid-identifier", severity: "error" },
		]);
	});

	it("requires content before planning a readiness notification", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = planner.execute(notReadyInput({ notificationContent: " " }));

		// Assert
		expect(result).toEqual({
			intents: [],
			diagnostics: [
				{ code: "missing-notification-content", severity: "error" },
			],
		});
	});

	it.each([
		["invalid event date", { eventDate: "2026-02-30" }, "invalid-event-date"],
		["non-ISO event date", { eventDate: "08/06/2026" }, "invalid-event-date"],
		["invalid time zone", { timeZone: "Mars/Olympus" }, "invalid-time-zone"],
		[
			"invalid readiness window",
			{ readinessWindowDays: -1 },
			"invalid-readiness-window",
		],
		[
			"fractional readiness window",
			{ readinessWindowDays: 1.5 },
			"invalid-readiness-window",
		],
	] as const)("fails closed for an %s", (_label, override, diagnosticCode) => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = planner.execute(notReadyInput(override));

		// Assert
		expect(result.intents).toEqual([]);
		expect(result.diagnostics).toContainEqual({
			code: diagnosticCode,
			severity: "error",
		});
	});
});
