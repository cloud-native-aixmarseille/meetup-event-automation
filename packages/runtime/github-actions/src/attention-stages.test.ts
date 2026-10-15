import { describe, expect, it } from "vitest";
import { AttentionStages } from "./attention-stages.js";
describe("typed attention stage boundary", () => {
	it.each(["skipped", "cancelled", "", undefined])(
		"marks %s stages unknown",
		(outcome) => {
			// Arrange
			const input = JSON.stringify({ assets: { outcome } });
			// Act
			const result = AttentionStages.parse(input);
			// Assert
			expect(result.find((stage) => stage.owner === "assets")?.outcome).toBe(
				"unknown",
			);
		},
	);
	it("recognizes audit diagnostics even when the original action reports success", () => {
		// Arrange
		const input = JSON.stringify({
			communications: {
				outcome: "success",
				diagnostics: JSON.stringify([
					{
						code: "communication.ledger-read-failed",
						severity: "error",
						message: "private@example.test",
					},
				]),
			},
		});
		// Act
		const result = AttentionStages.parse(input);
		// Assert
		expect(
			result.find((stage) => stage.owner === "communications"),
		).toMatchObject({ outcome: "success", blocked: true });
		expect(JSON.stringify(result)).not.toContain("private@example.test");
	});
	it.each([
		"communication.approval-rejected",
		"communication.approval-pending",
		"communication.delivery-already-recorded",
	])("does not turn %s into integration failure", (code) => {
		// Arrange
		const input = JSON.stringify({
			communications: {
				outcome: "success",
				diagnostics: [{ code, severity: "warning" }],
			},
		});
		// Act
		const result = AttentionStages.parse(input);
		// Assert
		expect(
			result.find((stage) => stage.owner === "communications")?.blocked,
		).toBe(false);
	});
});
