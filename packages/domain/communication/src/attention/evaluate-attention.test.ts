import { describe, expect, it } from "vitest";
import { facts } from "../../testing/attention.fixtures.js";
import { CommunicationDomainComposition } from "../dependency-composition.js";
import type { AttentionFacts } from "./evaluate-attention.js";
import { EvaluateAttention } from "./evaluate-attention.js";

describe("actionable attention conditions", () => {
	it.each([
		{ closed: true },
		{ occurrence: "cancelled" },
		{ occurrence: "postponed" },
	] satisfies Partial<AttentionFacts>[])(
		"suppresses stage alerts for a stopped event (%j) while retaining delivery recovery",
		(lifecycle) => {
			// Arrange
			const input = facts({
				...lifecycle,
				eventDate: "",
				approvals: undefined,
				stages: [
					{ owner: "communications", outcome: "failure", blocked: false },
					{ owner: "assets", outcome: "success", blocked: true },
					{ owner: "feedback", outcome: "unknown", blocked: false },
				],
				recovery: [
					{ key: "uncertain", uncertain: true },
					{ key: "rejected", uncertain: false },
				],
			});

			// Act
			const result = new EvaluateAttention({
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				postEventPolicy: new CommunicationDomainComposition().postEventPolicy(),
			}).execute(input, new Date("2099-06-01T10:00:00Z"));

			// Assert
			expect(result.stopped).toBe(true);
			expect(result.conditions).toMatchObject([
				{ code: "delivery-recovery", resource: "uncertain", recovery: true },
			]);
			expect(result.conditions).toHaveLength(1);
		},
	);

	it.each(["scheduled", "held"] as const)(
		"starts follow-up after the event date for %s events",
		(occurrence) => {
			// Arrange
			const input = facts({ occurrence, followUpPending: ["thank-host"] });

			// Act
			const result = new EvaluateAttention({
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				postEventPolicy: new CommunicationDomainComposition().postEventPolicy(),
			}).execute(input, new Date("2099-06-10T10:00:00Z"));

			// Assert
			expect(result.conditions.map((item) => item.code)).toEqual(["follow-up"]);
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
			const result = new EvaluateAttention({
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				postEventPolicy: new CommunicationDomainComposition().postEventPolicy(),
			}).execute(input, new Date("2099-06-01T10:00:00Z"));

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
			const result = new EvaluateAttention({
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				postEventPolicy: new CommunicationDomainComposition().postEventPolicy(),
			}).execute(input, new Date("2099-06-02T10:00:00Z"));

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
		const result = new EvaluateAttention({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
			postEventPolicy: new CommunicationDomainComposition().postEventPolicy(),
		}).execute(input, new Date("2099-06-01T10:00:00Z"));

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
		const result = new EvaluateAttention({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
			postEventPolicy: new CommunicationDomainComposition().postEventPolicy(),
		}).execute(input, new Date("2099-06-01T10:00:00Z"));

		// Assert
		expect(result.evaluated).toContain("assets");
		expect(result.evaluated).not.toContain("feedback");
		expect(result.conditions.map((item) => item.code)).toEqual([
			"integration-failure",
			"stage-unknown",
			"stage-unknown",
		]);
	});
	it("defers dependent stages without clearing their previous failures or creating duplicate alerts", () => {
		// Arrange
		const input = facts({
			stages: [
				{ owner: "event", outcome: "success", blocked: true },
				{
					owner: "communications",
					outcome: "failure",
					blocked: false,
					prerequisiteBlocked: true,
				},
				{
					owner: "feedback",
					outcome: "success",
					blocked: false,
					prerequisiteBlocked: true,
				},
			],
		});

		// Act
		const result = new EvaluateAttention({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
			postEventPolicy: new CommunicationDomainComposition().postEventPolicy(),
		}).execute(input, new Date("2099-06-01T10:00:00Z"));

		// Assert
		expect(result.conditions).toMatchObject([
			{ code: "integration-failure", owner: "event", resource: "event-data" },
		]);
		expect(result.conditions).toHaveLength(1);
		expect(result.evaluated).not.toContain("communications");
		expect(result.evaluated).not.toContain("feedback");
	});
});
