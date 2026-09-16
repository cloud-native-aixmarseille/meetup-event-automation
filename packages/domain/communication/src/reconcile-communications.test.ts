import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	DeliveryLedgerEntry,
	ReconcileCommunicationsInput,
} from "./model.js";
import { PlanCommunications } from "./plan-communications.js";
import type {
	CommunicationClock,
	DeliveryLedger,
	MailGateway,
	NotificationGateway,
} from "./ports.js";
import { ReconcileCommunications } from "./reconcile-communications.js";

const fixedInstant = new Date("2026-06-01T10:00:00.000Z");

let clock: CommunicationClock;

let ledger: DeliveryLedger;

let mailGateway: MailGateway;

let notificationGateway: NotificationGateway;

beforeEach(() => {
	clock = { now: vi.fn(() => new Date(fixedInstant.getTime())) };
	ledger = {
		find: vi.fn(async () => undefined),
		reservePending: vi.fn(async (reservation) => ({
			reserved: true as const,
			entry: {
				idempotencyKey: reservation.idempotencyKey,
				intentId: reservation.intentId,
				status: "pending" as const,
				updatedAt: reservation.reservedAt,
			},
		})),
		markAccepted: vi.fn(async () => undefined),
		markUncertain: vi.fn(async () => undefined),
		markRejected: vi.fn(async () => undefined),
		releasePending: vi.fn(async () => undefined),
	};
	mailGateway = {
		dispatch: vi.fn(async () => ({ outcome: "accepted" as const })),
	};
	notificationGateway = {
		dispatch: vi.fn(async () => ({ outcome: "accepted" as const })),
	};
});

describe("ReconcileCommunications", () => {
	it("fails closed when the clock throws", async () => {
		// Arrange
		vi.mocked(clock.now).mockImplementationOnce(() => {
			throw new Error("clock failed with private context");
		});

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(result).toEqual({
			mode: "dispatch",
			intentIds: [],
			counts: {
				planned: 0,
				due: 0,
				alreadyRecorded: 0,
				reserved: 0,
				dispatched: 0,
				accepted: 0,
				uncertain: 0,
				rejected: 0,
				deferred: 0,
			},
			diagnostics: [{ code: "invalid-clock", severity: "error" }],
		});
		expect(ledger.find).not.toHaveBeenCalled();
	});

	it("fails closed when the clock returns an invalid instant", async () => {
		// Arrange
		vi.mocked(clock.now).mockReturnValueOnce(new Date("invalid"));

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(result).toEqual({
			mode: "dispatch",
			intentIds: [],
			counts: {
				planned: 0,
				due: 0,
				alreadyRecorded: 0,
				reserved: 0,
				dispatched: 0,
				accepted: 0,
				uncertain: 0,
				rejected: 0,
				deferred: 0,
			},
			diagnostics: [{ code: "invalid-clock", severity: "error" }],
		});
		expect(ledger.find).not.toHaveBeenCalled();
	});

	it("checks the plan and ledger without reserving or dispatching", async () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = await reconciler().execute(input({ mode: "check" }));

		// Assert
		expect(result.counts).toEqual({
			planned: 1,
			due: 1,
			alreadyRecorded: 0,
			reserved: 0,
			dispatched: 0,
			accepted: 0,
			uncertain: 0,
			rejected: 0,
			deferred: 0,
		});
		expect(ledger.find).toHaveBeenCalledOnce();
		expect(ledger.reservePending).not.toHaveBeenCalled();
		expect(mailGateway.dispatch).not.toHaveBeenCalled();
		expect(ledger.markAccepted).not.toHaveBeenCalled();
	});

	it("keeps unavailable gateways in the business plan without reserving", async () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = await reconciler().execute(
			input({
				dispatchCapabilities: { mail: false, notification: true },
			}),
		);

		// Assert
		expect(result.counts).toMatchObject({
			planned: 1,
			due: 1,
			reserved: 0,
			dispatched: 0,
		});
		expect(ledger.find).toHaveBeenCalledOnce();
		expect(ledger.reservePending).not.toHaveBeenCalled();
		expect(mailGateway.dispatch).not.toHaveBeenCalled();
	});

	it("reserves pending before dispatch and records an acknowledgement as accepted", async () => {
		// Arrange
		const calls: string[] = [];
		vi.mocked(ledger.find).mockImplementation(async () => {
			calls.push("find");
			return undefined;
		});
		vi.mocked(ledger.reservePending).mockImplementation(async (reservation) => {
			calls.push("reserve-pending");
			return {
				reserved: true,
				entry: {
					idempotencyKey: reservation.idempotencyKey,
					intentId: reservation.intentId,
					status: "pending",
					updatedAt: reservation.reservedAt,
				},
			};
		});
		vi.mocked(mailGateway.dispatch).mockImplementation(async () => {
			calls.push("gateway");
			return { outcome: "accepted" };
		});
		vi.mocked(ledger.markAccepted).mockImplementation(async () => {
			calls.push("mark-accepted");
		});

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(calls).toEqual([
			"find",
			"reserve-pending",
			"gateway",
			"mark-accepted",
		]);
		expect(result.counts).toEqual({
			planned: 1,
			due: 1,
			alreadyRecorded: 0,
			reserved: 1,
			dispatched: 1,
			accepted: 1,
			uncertain: 0,
			rejected: 0,
			deferred: 0,
		});
		expect(ledger.reservePending).toHaveBeenCalledWith(
			expect.objectContaining({
				repositoryId: "cloud-native-aixmarseille/meetups",
				eventId: "issue:123",
				kind: "host-introduction",
				recipientId: "host-contact-1",
				policyVersion: "communication-v2",
				reservedAt: fixedInstant.toISOString(),
			}),
		);
		expect(ledger.markAccepted).toHaveBeenCalledWith(
			result.intentIds[0],
			fixedInstant.toISOString(),
		);
	});

	it.each(["pending", "uncertain", "accepted", "rejected"] as const)(
		"never automatically retries an existing %s delivery",
		async (status) => {
			// Arrange
			vi.mocked(ledger.find).mockResolvedValue(existingEntry(status));

			// Act
			const result = await reconciler().execute(input());

			// Assert
			expect(result.counts.alreadyRecorded).toBe(1);
			expect(result.counts.reserved).toBe(0);
			expect(result.counts.dispatched).toBe(0);
			expect(result.diagnostics).toContainEqual(
				expect.objectContaining({
					code: "delivery-already-recorded",
					deliveryStatus: status,
				}),
			);
			expect(ledger.reservePending).not.toHaveBeenCalled();
			expect(mailGateway.dispatch).not.toHaveBeenCalled();
		},
	);

	it("honors an atomic reservation lost to a concurrent reconciler", async () => {
		// Arrange
		vi.mocked(ledger.reservePending).mockResolvedValue({
			reserved: false,
			entry: existingEntry("pending"),
		});

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(result.counts).toMatchObject({
			due: 1,
			alreadyRecorded: 1,
			reserved: 0,
			dispatched: 0,
		});
		expect(mailGateway.dispatch).not.toHaveBeenCalled();
	});

	it("records an explicitly ambiguous gateway result as uncertain", async () => {
		// Arrange
		vi.mocked(mailGateway.dispatch).mockResolvedValue({
			outcome: "uncertain",
			diagnosticCode: "provider-timeout",
		});

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(result.counts).toMatchObject({ dispatched: 1, uncertain: 1 });
		expect(ledger.markUncertain).toHaveBeenCalledWith(
			result.intentIds[0],
			fixedInstant.toISOString(),
			"provider-timeout",
		);
		expect(ledger.markAccepted).not.toHaveBeenCalled();
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "gateway-delivery-uncertain",
				severity: "error",
				detailCode: "provider-timeout",
			}),
		);
	});

	it("records a definitive gateway rejection and surfaces an error", async () => {
		// Arrange
		vi.mocked(mailGateway.dispatch).mockResolvedValue({
			outcome: "rejected",
			diagnosticCode: "authentication-failed",
		});

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(result.counts).toMatchObject({
			dispatched: 1,
			rejected: 1,
			uncertain: 0,
		});
		expect(ledger.markRejected).toHaveBeenCalledWith(
			result.intentIds[0],
			fixedInstant.toISOString(),
			"authentication-failed",
		);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "gateway-delivery-rejected",
				severity: "error",
				detailCode: "authentication-failed",
			}),
		);
	});

	it("releases a definitively deferred reservation for a safe retry", async () => {
		// Arrange
		vi.mocked(mailGateway.dispatch).mockResolvedValue({
			outcome: "deferred",
			diagnosticCode: "rate-limited",
		});

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(result.counts).toMatchObject({
			dispatched: 1,
			deferred: 1,
			uncertain: 0,
		});
		expect(ledger.releasePending).toHaveBeenCalledWith(result.intentIds[0]);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "gateway-delivery-deferred",
				severity: "warning",
				detailCode: "rate-limited",
			}),
		);
	});

	it("drops gateway detail codes outside the domain allowlist", async () => {
		// Arrange
		vi.mocked(mailGateway.dispatch).mockResolvedValue({
			outcome: "uncertain",
			diagnosticCode: "private-recipient-name" as never,
		});

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "gateway-delivery-uncertain",
			}),
		);
		expect(result.diagnostics).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ detailCode: "private-recipient-name" }),
			]),
		);
		expect(ledger.markUncertain).toHaveBeenCalledWith(
			result.intentIds[0],
			fixedInstant.toISOString(),
			"gateway-delivery-uncertain",
		);
	});

	it("treats a thrown gateway error as ambiguous without exposing it", async () => {
		// Arrange
		vi.mocked(mailGateway.dispatch).mockRejectedValue(
			new Error("SMTP failed for private-person@example.test"),
		);

		// Act
		const result = await reconciler().execute(input());
		const serializedResult = JSON.stringify(result);

		// Assert
		expect(result.counts).toMatchObject({ dispatched: 1, uncertain: 1 });
		expect(ledger.markUncertain).toHaveBeenCalledWith(
			result.intentIds[0],
			fixedInstant.toISOString(),
			"gateway-threw-ambiguous-error",
		);
		expect(serializedResult).not.toContain("private-person@example.test");
		expect(serializedResult).not.toContain("SMTP failed");
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "gateway-threw-ambiguous-error",
				severity: "error",
			}),
		);
	});

	it("dispatches reminders through the notification gateway", async () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = await reconciler().execute(
			input({
				readiness: "not-ready",
				mailRecipients: [],
				notificationRecipients: [
					{
						channel: "notification",
						recipientId: "organizers-slack",
						role: "organizers",
						destination: "private-slack-channel",
						receivesCommunications: true,
					},
				],
			}),
		);
		const actual = JSON.stringify(result);
		const actual1 = JSON.stringify(result);

		// Assert
		expect(result.counts.accepted).toBe(1);
		expect(notificationGateway.dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				channel: "notification",
				kind: "readiness-reminder",
			}),
		);
		expect(mailGateway.dispatch).not.toHaveBeenCalled();
		expect(actual).not.toContain("private-slack-channel");
		expect(actual1).not.toContain("Meetup private details");
	});

	it("does not dispatch when the ledger cannot be read", async () => {
		// Arrange
		vi.mocked(ledger.find).mockRejectedValueOnce(new Error("private data"));

		// Act
		const readFailure = await reconciler().execute(input());

		// Assert
		expect(readFailure.diagnostics).toContainEqual(
			expect.objectContaining({ code: "ledger-read-failed" }),
		);
		expect(mailGateway.dispatch).not.toHaveBeenCalled();
		expect(JSON.stringify(readFailure)).not.toContain("private data");
	});

	it("does not dispatch when the ledger cannot reserve delivery", async () => {
		// Arrange
		vi.mocked(ledger.find).mockResolvedValue(undefined);
		vi.mocked(ledger.reservePending).mockRejectedValueOnce(
			new Error("private data"),
		);

		// Act
		const reservationFailure = await reconciler().execute(input());

		// Assert
		expect(reservationFailure.diagnostics).toContainEqual(
			expect.objectContaining({ code: "ledger-reservation-failed" }),
		);
		expect(mailGateway.dispatch).not.toHaveBeenCalled();
		expect(JSON.stringify(reservationFailure)).not.toContain("private data");
	});

	it("keeps an accepted delivery protected by pending when status persistence fails", async () => {
		// Arrange
		vi.mocked(ledger.markAccepted).mockRejectedValue(
			new Error("storage unavailable"),
		);

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(result.counts.accepted).toBe(1);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "ledger-status-write-failed" }),
		);
	});

	it("keeps an uncertain delivery protected by pending when status persistence fails", async () => {
		// Arrange
		vi.mocked(mailGateway.dispatch).mockResolvedValue({
			outcome: "uncertain",
			diagnosticCode: "connection-reset",
		});
		vi.mocked(ledger.markUncertain).mockRejectedValue(
			new Error("storage unavailable"),
		);

		// Act
		const result = await reconciler().execute(input());

		// Assert
		expect(result.counts.uncertain).toBe(1);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "ledger-status-write-failed" }),
		);
	});

	it("does not trust a ledger-provided intent identifier in redacted output", async () => {
		// Arrange
		vi.mocked(ledger.find).mockResolvedValue({
			...existingEntry("accepted"),
			intentId: "private-person@example.test",
		});

		// Act
		const result = await reconciler().execute(input());
		const actual = JSON.stringify(result);

		// Assert
		expect(actual).not.toContain("private-person@example.test");
		expect(result.diagnostics[0]?.intentId).toBe(result.intentIds[0]);
	});

	it("returns only redacted identifiers, counts, and diagnostics", async () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = await reconciler().execute(
			input({
				mailRecipients: [
					{
						channel: "mail",
						recipientId: "host-contact-1",
						role: "hosting",
						email: "private-host@example.test",
						receivesCommunications: true,
						placeholders: { contactName: "Private Host" },
					},
				],
				mailPlaceholders: { privateAddress: "Private street" },
			}),
		);
		const serialized = JSON.stringify(result);
		const actual = Object.keys(result).sort();

		// Assert
		expect(actual).toEqual(["counts", "diagnostics", "intentIds", "mode"]);
		expect(serialized).not.toContain("private-host@example.test");
		expect(serialized).not.toContain("Private Host");
		expect(serialized).not.toContain("Private street");
	});
});

function reconciler() {
	return new ReconcileCommunications({
		planner: new PlanCommunications(),
		clock,
		ledger,
		mailGateway,
		notificationGateway,
	});
}

function input(
	override: Partial<ReconcileCommunicationsInput> = {},
): ReconcileCommunicationsInput {
	return {
		mode: "dispatch",
		repositoryId: "cloud-native-aixmarseille/meetups",
		eventId: "issue:123",
		eventDate: "2026-06-08",
		timeZone: "Europe/Paris",
		readiness: "ready",
		occurrenceStatus: "scheduled",
		policyVersion: "communication-v2",
		readinessWindowDays: 7,
		mailRecipients: [
			{
				channel: "mail",
				recipientId: "host-contact-1",
				role: "hosting",
				email: "host@example.test",
				receivesCommunications: true,
			},
		],
		notificationRecipients: [],
		mailPlaceholders: { eventTitle: "A meetup" },
		notificationContent: "Meetup private details",
		...override,
	};
}

function existingEntry(
	status: DeliveryLedgerEntry["status"],
): DeliveryLedgerEntry {
	return {
		idempotencyKey: "existing-id",
		intentId: "existing-id",
		status,
		updatedAt: "2026-05-01T10:00:00.000Z",
	};
}
