import { describe, expect, it } from "vitest";
import { ResultEnvelopeFactory } from "./result-envelope.js";

describe("result envelope", () => {
	it("uses a stable schema and diagnostic status", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const actual = ResultEnvelopeFactory.resultEnvelope({ changed: false }, [
			{
				code: "event.title.missing",
				severity: "error",
				message: "An event title is required",
			},
		]);

		// Assert
		expect(actual).toMatchObject({ schemaVersion: 1, status: "diagnostics" });
	});
});
