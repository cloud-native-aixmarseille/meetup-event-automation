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
		mailRecipients: [mailRecipient("host-1", "hosting", "host@example.test")],
		mailPlaceholders: { eventTitle: "A meetup" },
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

describe("PlanCommunications", () => {
	it("waits for readiness before planning introductory mail", () => {
		// Arrange
		const input = baseInput({ readiness: "not-ready" });

		// Act
		const result = planner.execute(input);

		// Assert
		expect(result.intents).toEqual([]);
		expect(result.diagnostics).toEqual([]);
	});
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

	it("plans thanks for held events and elapsed scheduled dates", () => {
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
		expect(merelyPast.intents).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ kind: "host-thanks" }),
			]),
		);
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
		expect(result.diagnostics).toEqual([]);
		expect(result.intents.map((intent) => intent.kind)).toEqual([
			"host-thanks",
		]);
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

	it.each([
		["invalid event date", { eventDate: "2026-02-30" }, "invalid-event-date"],
		["non-ISO event date", { eventDate: "08/06/2026" }, "invalid-event-date"],
		["invalid time zone", { timeZone: "Mars/Olympus" }, "invalid-time-zone"],
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
