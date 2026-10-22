import { describe, expect, it } from "vitest";
import { SystemEventClock } from "./system-event-clock.js";

describe("SystemEventClock", () => {
	it("returns the injected instant through its clock contract", () => {
		// Arrange
		const instant = new Date("2026-03-29T00:30:00.000Z");
		const clock = new SystemEventClock(() => instant);

		// Act
		const result = clock.now();

		// Assert
		expect(result).toBe(instant.toISOString());
	});
});
