import { describe, expect, it } from "vitest";
import { RuntimeInput } from "./runtime-input.js";

describe("GitHub Action input parsing", () => {
	it("accepts a positive safe issue identifier", () => {
		// Arrange
		const input = "42";

		// Act
		const result = new RuntimeInput().positiveIntegerInput(
			"issue-number",
			input,
		);

		// Assert
		expect(result).toBe(42);
	});

	it.each(["0", "1.2", "9007199254740992"])(
		"rejects invalid issue identifier %s",
		(input) => {
			// Arrange
			const name = "issue-number";

			// Act
			const parse = () => new RuntimeInput().positiveIntegerInput(name, input);

			// Assert
			expect(parse).toThrow("issue-number must be a positive integer");
		},
	);

	it.each(["check", "fix"])("accepts the allowed enum value %s", (input) => {
		// Arrange
		const allowed = ["check", "fix"];

		// Act
		const result = new RuntimeInput().enumInput("mode", input, allowed);

		// Assert
		expect(result).toBe(input);
	});

	it("rejects an enum value outside the allowed set", () => {
		// Arrange
		const input = "write";
		const allowed = ["check", "fix"];

		// Act
		const parse = () => new RuntimeInput().enumInput("mode", input, allowed);

		// Assert
		expect(parse).toThrow("mode must be one of: check, fix");
	});

	it.each([
		["true", true],
		["false", false],
	] as const)("accepts the explicit boolean value %s", (input, expected) => {
		// Arrange
		const name = "authorized";

		// Act
		const result = new RuntimeInput().booleanInput(name, input);

		// Assert
		expect(result).toBe(expected);
	});

	it("rejects implicit boolean coercion", () => {
		// Arrange
		const input = "1";

		// Act
		const parse = () => new RuntimeInput().booleanInput("authorized", input);

		// Assert
		expect(parse).toThrow("authorized must be true or false");
	});
});

describe("GitHub Action input boundaries", () => {
	it("accepts an explicit true and rejects unsafe numeric overflow", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const actual = new RuntimeInput().booleanInput("slides-ready", "true");
		const act = () =>
			new RuntimeInput().positiveIntegerInput(
				"issue-number",
				"9007199254740992",
			);

		// Assert
		expect(actual).toBe(true);
		expect(act).toThrow("issue-number must be a positive integer");
	});
});
