import { describe, expect, it } from "vitest";
import { attentionReports } from "../../testing/attention-reports.fixtures.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { AttentionStageEvaluation } from "./attention-stage-evaluation.js";

describe("attention stage evidence policy", () => {
	it.each([
		{ outcome: "unknown" as const },
		{ outcome: "failure" as const },
		{ reported: false },
		{
			diagnostics: [
				{
					code: "event.concurrently-modified",
					severity: "info" as const,
					message: "concurrent",
				},
			],
		},
		{
			diagnostics: [
				{
					code: "communication.ledger-read-failed",
					severity: "error" as const,
					message: "failed",
				},
			],
		},
	])("preserves unresolved tasks after incomplete evidence %j", (stage) => {
		// Arrange
		const reports = attentionReports({ communications: stage });

		// Act
		const complete = new AttentionStageEvaluation({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
		}).complete(reports);

		// Assert
		expect(complete).toBe(false);
	});
	it("distinguishes an organizer prerequisite from a failed integration", () => {
		// Arrange
		const reports = attentionReports({
			event: {
				diagnostics: [
					{ code: "event.date.missing", severity: "error", message: "missing" },
				],
			},
			assets: {
				diagnostics: [
					{ code: "event.date.missing", severity: "error", message: "missing" },
				],
			},
			communications: {
				diagnostics: [
					{
						code: "communication.ledger-read-failed",
						severity: "error",
						message: "failure",
					},
				],
			},
		});

		// Act
		const stages = new AttentionStageEvaluation({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
		}).evaluate(reports);

		// Assert
		expect(stages.find((stage) => stage.owner === "assets")).toMatchObject({
			blocked: false,
			prerequisiteBlocked: true,
		});
		expect(
			stages.find((stage) => stage.owner === "communications"),
		).toMatchObject({ blocked: true });
	});
});
