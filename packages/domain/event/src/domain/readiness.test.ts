import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../testing/event.fixtures.js";
import { EventReadinessPolicy } from "./readiness.js";

describe("EventReadinessPolicy", () => {
	it("reports an event with unconfirmed participants as incomplete", () => {
		// Arrange
		const incomplete = createTestEvent({
			confirmations: { host: false, speakers: true },
		});

		// Act
		const status = EventReadinessPolicy.evaluateEventReadiness(
			incomplete,
			[],
		).status;

		// Assert
		expect(status).toBe("incomplete");
	});
	it("reports an event with error diagnostics as invalid", () => {
		// Arrange
		// Use the shared fixtures.

		// Act
		const invalid = EventReadinessPolicy.evaluateEventReadiness(
			createTestEvent(),
			[
				{
					code: "event.date.invalid",
					severity: "error",
					category: "invalid",
					message: "Invalid date",
				},
			],
		);

		// Assert
		expect(invalid.status).toBe("invalid");
	});
	it.each(["postponed", "cancelled"] as const)(
		"never marks an explicitly %s event ready",
		(occurrenceStatus) => {
			// Arrange
			// No additional setup is needed.

			// Act
			const readiness = EventReadinessPolicy.evaluateEventReadiness(
				createTestEvent({ occurrenceStatus }),
				[],
			);

			// Assert
			expect(readiness).toMatchObject({ status: "incomplete", isReady: false });
		},
	);
});
