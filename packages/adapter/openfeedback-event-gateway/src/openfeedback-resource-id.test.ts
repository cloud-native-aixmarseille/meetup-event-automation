import { describe, expect, it } from "vitest";
import { OpenFeedbackResourceId } from "./openfeedback-resource-id.js";

describe("stored OpenFeedback resource IDs", () => {
	it.each(["generated-id", "speaker:Aléx #1?x=y&z=%", "x".repeat(1500)])(
		"accepts an existing document ID: %s",
		(id) => {
			// Arrange
			const candidate = id;

			// Act
			const valid = new OpenFeedbackResourceId().isValid(candidate);

			// Assert
			expect(valid).toBe(true);
		},
	);

	it.each([
		undefined,
		null,
		42,
		"",
		".",
		"..",
		"bad/id",
		"__reserved__",
		"x".repeat(1501),
	])("rejects an invalid document ID: %s", (id) => {
		// Arrange
		const candidate = id;

		// Act
		const valid = new OpenFeedbackResourceId().isValid(candidate);

		// Assert
		expect(valid).toBe(false);
	});
});
