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
		const parse = () => new AttentionStageInput().parse(encoded);

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
		const result = new AttentionStageInput().parse(encoded);

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

describe("grouped stage evidence", () => {
	it.each(["failure", "skipped", "cancelled"])(
		"preserves incomplete document/PDF evidence for %s",
		(outcome) => {
			// Arrange
			const parser = new AttentionStageInput();
			const input = JSON.stringify({
				assets: [
					{ outcome: "success", diagnostics: "[]" },
					{ outcome, diagnostics: "" },
				],
			});
			// Act
			const result = parser.parse(input);
			// Assert
			expect(result.assets.reported).toBe(false);
			expect(result.assets.outcome).toBe(
				outcome === "failure" ? "failure" : "unknown",
			);
		},
	);
	it("merges diagnostics only while retaining every constituent stage's completion evidence", () => {
		// Arrange
		const parser = new AttentionStageInput();
		const diagnostic = {
			code: "publication.assets.pdf.conflict",
			severity: "warning",
			field: "publicationLinks.assets",
		};
		const input = JSON.stringify({
			assets: [
				{ outcome: "success", diagnostics: "[]" },
				{ outcome: "success", diagnostics: JSON.stringify([diagnostic]) },
			],
		});
		// Act
		const result = parser.parse(input);
		// Assert
		expect(result.assets).toMatchObject({
			outcome: "success",
			reported: true,
			diagnostics: [diagnostic],
		});
	});
});
