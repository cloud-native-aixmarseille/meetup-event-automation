import { describe, expect, it } from "vitest";
import { AttentionStageInput } from "./attention-stage-input.js";

describe("workflow attention input decoding", () => {
	it.each([
		null,
		[],
		{ event: [] },
		{ assets: "success" },
		{
			feedback: {
				diagnostics: [
					{ code: "event.date.invalid", severity: { toString: "error" } },
				],
			},
		},
	])("rejects malformed stage records %j", (value) => {
		// Arrange
		const encoded = JSON.stringify(value);

		// Act
		const parse = () => AttentionStageInput.parse(encoded);

		// Assert
		expect(parse).toThrow();
	});
	it("projects only allowed public diagnostic facts from complete reports", () => {
		// Arrange
		const encoded = JSON.stringify({
			event: {
				outcome: "success",
				diagnostics: [
					{
						code: "event.date.invalid",
						severity: "error",
						message: "private@example.test",
						field: "private@example.test",
						fixApplied: false,
					},
				],
			},
		});

		// Act
		const result = AttentionStageInput.parse(encoded);

		// Assert
		expect(result.event).toEqual({
			outcome: "success",
			reported: true,
			diagnostics: [
				{
					code: "event.date.invalid",
					severity: "error",
					message: "event.date.invalid",
					fixApplied: false,
				},
			],
		});
		expect(result.assets).toEqual({
			outcome: "unknown",
			reported: false,
			diagnostics: [],
		});
	});
});
