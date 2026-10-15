import { describe, expect, it } from "vitest";
import { facts } from "../../testing/attention.fixtures.js";
import { EvaluateAttention } from "./evaluate-attention.js";
describe("actionable attention conditions", () => {
	it.each(["scheduled", "held"] as const)(
		"requires an explicit occurrence decision before follow-up (%s)",
		(occurrence) => {
			// Arrange
			const input = facts({ occurrence, followUpPending: ["thank-host"] });
			// Act
			const result = EvaluateAttention.execute(
				input,
				new Date("2099-06-10T10:00:00Z"),
			);
			// Assert
			expect(result.conditions.map((item) => item.code)).toEqual([
				occurrence === "held" ? "follow-up" : "occurrence-decision",
			]);
		},
	);
	it.each(["cancelled", "postponed"] as const)(
		"retains recovery but stops task conditions for %s",
		(occurrence) => {
			// Arrange
			const input = facts({
				occurrence,
				hostConfirmed: false,
				followUpPending: ["thank-host"],
				recovery: [{ key: "sha256:abc" }],
			});
			// Act
			const result = EvaluateAttention.execute(
				input,
				new Date("2099-06-01T10:00:00Z"),
			);
			// Assert
			expect(result.stopped).toBe(true);
			expect(result.conditions.map((item) => item.code)).toEqual([
				"delivery-recovery",
			]);
		},
	);
	it.each(["pending", "approved", "rejected"] as const)(
		"respects the final approval decision %s",
		(status) => {
			// Arrange
			const input = facts({
				approvals: [
					{
						revision: "a".repeat(64),
						eventDate: "2099-06-08",
						kind: "email-introduction",
						requestedAt: "2099-06-01T10:00:00Z",
						commentId: 42,
						status,
					},
				],
			});
			// Act
			const result = EvaluateAttention.execute(
				input,
				new Date("2099-06-02T10:00:00Z"),
			);
			// Assert
			expect(result.conditions.map((item) => item.code)).toEqual(
				status === "pending" ? ["approval-pending"] : [],
			);
		},
	);
	it("uses a weekly data-quality condition for an unscheduled event", () => {
		// Arrange
		const input = facts({ eventDate: "" });
		// Act
		const result = EvaluateAttention.execute(
			input,
			new Date("2099-06-01T10:00:00Z"),
		);
		// Assert
		expect(result.conditions).toMatchObject([
			{ code: "missing-date", policy: "weekly" },
		]);
	});
	it("distinguishes failed integrations from unexecuted stages and missing evidence", () => {
		// Arrange
		const input = facts({
			approvals: undefined,
			stages: [
				{ owner: "assets", outcome: "failure", blocked: false },
				{ owner: "feedback", outcome: "unknown", blocked: false },
			],
		});
		// Act
		const result = EvaluateAttention.execute(
			input,
			new Date("2099-06-01T10:00:00Z"),
		);
		// Assert
		expect(result.evaluated).toContain("assets");
		expect(result.evaluated).not.toContain("feedback");
		expect(result.conditions.map((item) => item.code)).toEqual([
			"integration-failure",
			"stage-unknown",
			"stage-unknown",
		]);
	});
});
