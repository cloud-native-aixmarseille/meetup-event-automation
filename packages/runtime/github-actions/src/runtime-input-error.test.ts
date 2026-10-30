import { expect, it } from "vitest";
import { RuntimeInputError } from "./runtime-input-error.js";

it("identifies a schema requirement as a reportable input failure", () => {
	// Arrange
	const field = "stage-results.assets[1].diagnostics";

	// Act
	const error = new RuntimeInputError(field, "must be an array");

	// Assert
	expect(error).toBeInstanceOf(Error);
	expect(error.name).toBe("RuntimeInputError");
	expect(error.message).toBe(
		"stage-results.assets[1].diagnostics must be an array",
	);
});
