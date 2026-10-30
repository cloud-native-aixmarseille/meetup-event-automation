import { describe, expect, it } from "vitest";
import { AttentionStageInput } from "./attention-stage-input.js";
import { RuntimeInputError } from "./runtime-input-error.js";

describe("workflow attention input decoding", () => {
	it.each([
		["PRIVATE_INVALID_JSON", "stage-results must contain valid JSON"],
		[
			JSON.stringify({ event: { diagnostics: "PRIVATE_INVALID_JSON" } }),
			"stage-results.event.diagnostics must contain valid JSON",
		],
		[
			JSON.stringify({ event: { diagnostics: { value: "PRIVATE_VALUE" } } }),
			"stage-results.event.diagnostics must be an array",
		],
		[
			JSON.stringify({
				assets: [{ diagnostics: [] }, { diagnostics: ["PRIVATE_VALUE"] }],
			}),
			"stage-results.assets[1].diagnostics[0] must be an object",
		],
		[
			JSON.stringify({
				feedback: {
					diagnostics: [
						{
							code: "PRIVATE_VALUE",
							field: "PRIVATE_FIELD",
							severity: "error",
						},
					],
				},
			}),
			"stage-results.feedback.diagnostics[0].code must be a supported diagnostic code",
		],
		[
			JSON.stringify({
				feedback: {
					diagnostics: [
						{
							code: "event.date.invalid",
							field: "PRIVATE_FIELD",
							severity: "PRIVATE_VALUE",
						},
					],
				},
			}),
			"stage-results.feedback.diagnostics[0].severity must be error, warning or info",
		],
	])(
		"identifies invalid schema paths without including input values: %s",
		(encoded, expected) => {
			// Arrange
			const parser = new AttentionStageInput();

			// Act
			const parse = () => parser.parse(encoded);

			// Assert
			expect(parse).toThrow(expected);
			expect(parse).toThrow(RuntimeInputError);
		},
	);
	it("accepts an independent social report and retains only allowlisted target fields", () => {
		// Arrange
		const encoded = JSON.stringify({
			social: {
				outcome: "success",
				diagnostics: [
					{
						code: "communication.social.pending",
						severity: "warning",
						field: "social.community.announcement",
						message: "private@example.test",
					},
					{
						code: "communication.social.blocked",
						severity: "warning",
						field: "social.private@example.test.d7",
						message: "private@example.test",
					},
				],
			},
		});

		// Act
		const result = new AttentionStageInput().parse(encoded);

		// Assert
		expect(result.social).toMatchObject({
			outcome: "success",
			reported: true,
			diagnostics: [
				{
					code: "communication.social.pending",
					field: "social.community.announcement",
				},
				{ code: "communication.social.blocked" },
			],
		});
		expect(JSON.stringify(result)).not.toContain("private@example.test");
		expect(result.event.outcome).toBe("unknown");
	});
	it.each([
		null,
		[],
		{ event: [] },
		{ assets: "success" },
		{ event: { diagnostics: "null" } },
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
	it.each([undefined, null, ""])(
		"retains incomplete evidence when a successful job omits diagnostics %j",
		(diagnostics) => {
			// Arrange
			const input = JSON.stringify({
				event: { outcome: "success", diagnostics },
				assets: [
					{ outcome: "success", diagnostics: "[]" },
					{ outcome: "success", diagnostics },
				],
			});

			// Act
			const result = new AttentionStageInput().parse(input);

			// Assert
			for (const report of [result.event, result.assets])
				expect(report).toEqual({
					outcome: "success",
					reported: false,
					diagnostics: [],
				});
		},
	);
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
