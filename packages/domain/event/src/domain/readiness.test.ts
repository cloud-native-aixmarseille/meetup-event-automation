import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../testing/event.fixtures.js";
import { EventDomainComposition } from "../dependency-composition.js";
import { EventReadinessPolicy } from "./readiness.js";

describe("EventReadinessPolicy", () => {
	it("reports an event without a selected host as incomplete", () => {
		// Arrange
		const incomplete = createTestEvent({
			host: undefined,
			confirmations: { speakers: true },
		});

		// Act
		const status = new EventReadinessPolicy({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
		}).evaluateEventReadiness(incomplete, []).status;

		// Assert
		expect(status).toBe("incomplete");
	});
	it("accepts a selected host without a confirmation label", () => {
		// Arrange
		const event = createTestEvent({ labels: ["meetup", "speakers:confirmed"] });
		const policy = new EventReadinessPolicy({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
		});

		// Act
		const result = policy.evaluateEventReadiness(event, []);

		// Assert
		expect(result.isReady).toBe(true);
		expect(result.diagnostics).toEqual([]);
	});
	it("reports an event with error diagnostics as invalid", () => {
		// Arrange
		// Use the shared fixtures.

		// Act
		const invalid = new EventReadinessPolicy({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
		}).evaluateEventReadiness(createTestEvent(), [
			{
				code: "event.date.invalid",
				severity: "error",
				category: "invalid",
				message: "Invalid date",
			},
		]);

		// Assert
		expect(invalid.status).toBe("invalid");
	});
	it.each(["postponed", "cancelled"] as const)(
		"never marks an explicitly %s event ready",
		(occurrenceStatus) => {
			// Arrange
			// No additional setup is needed.

			// Act
			const readiness = new EventReadinessPolicy({
				eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			}).evaluateEventReadiness(createTestEvent({ occurrenceStatus }), []);

			// Assert
			expect(readiness).toMatchObject({ status: "incomplete", isReady: false });
		},
	);
});
