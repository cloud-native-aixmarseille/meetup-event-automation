import { describe, expect, it } from "vitest";
import { attentionReports } from "../../testing/attention-reports.fixtures.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { AttentionStageEvaluation } from "./attention-stage-evaluation.js";

describe("attention stage evidence policy", () => {
	it.each([
		"publication.meetup.authentication-redirect-timeout",
		"publication.meetup.authentication-account-unavailable",
		"publication.meetup.editor",
	])(
		"retains the classified failure during an incomplete audit: %s",
		(code) => {
			// Arrange
			const composition = new JourneyPolicyComposition();
			const evaluation = new AttentionStageEvaluation({
				diagnosticPolicy: composition.diagnosticPolicy(),
				organizerDiagnosticPolicy: composition.organizerDiagnosticPolicy(),
			});
			const reports = attentionReports({
				event: {
					outcome: "failure",
					diagnostics: [
						{ code, severity: "error", message: "private provider response" },
					],
				},
			});

			// Act
			const stages = evaluation.evaluate(reports);
			const complete = evaluation.complete(reports);

			// Assert
			expect(complete).toBe(false);
			expect(stages.find((stage) => stage.owner === "event")).toEqual({
				owner: "event",
				outcome: "failure",
				blocked: true,
				failureResource: code,
			});
			expect(JSON.stringify(stages)).not.toContain("private provider response");
		},
	);
	it("does not forward unclassified provider codes to attention state", () => {
		// Arrange
		const composition = new JourneyPolicyComposition();
		const evaluation = new AttentionStageEvaluation({
			diagnosticPolicy: composition.diagnosticPolicy(),
			organizerDiagnosticPolicy: composition.organizerDiagnosticPolicy(),
		});
		const reports = attentionReports({
			event: {
				outcome: "failure",
				diagnostics: [
					{
						code: "publication.meetup.private-value",
						severity: "error",
						message: "private",
					},
				],
			},
		});

		// Act
		const stages = evaluation.evaluate(reports);

		// Assert
		expect(stages.find((stage) => stage.owner === "event")).toEqual({
			owner: "event",
			outcome: "failure",
			blocked: true,
		});
	});
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
					code: "action.comment-concurrently-modified",
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

describe("publication readiness evidence", () => {
	it.each([
		"publication.community.missing",
		"publication.meetup.missing",
		"publication.assets.missing",
		"publication.community.unpublished",
		"publication.meetup.unpublished",
		"publication.community.approval-pending",
		"publication.meetup.approval-pending",
		"publication.community.approval-rejected",
		"publication.meetup.approval-rejected",
		"publication.meetup.uncertain",
	])("keeps a completed audit verifiable when %s remains", (code) => {
		// Arrange
		const composition = new JourneyPolicyComposition();
		const evaluation = new AttentionStageEvaluation({
			diagnosticPolicy: composition.diagnosticPolicy(),
			organizerDiagnosticPolicy: composition.organizerDiagnosticPolicy(),
		});
		const reports = attentionReports({
			event: { diagnostics: [{ code, severity: "warning", message: code }] },
		});

		// Act
		const stages = evaluation.evaluate(reports);

		// Assert
		expect(stages.find((stage) => stage.owner === "event")).toEqual({
			owner: "event",
			outcome: "success",
			blocked: false,
		});
	});

	it("keeps concurrent comment work incomplete without adding a technical task", () => {
		// Arrange
		const composition = new JourneyPolicyComposition();
		const evaluation = new AttentionStageEvaluation({
			diagnosticPolicy: composition.diagnosticPolicy(),
			organizerDiagnosticPolicy: composition.organizerDiagnosticPolicy(),
		});
		const reports = attentionReports({
			communications: {
				diagnostics: [
					{
						code: "action.comment-concurrently-modified",
						severity: "info",
						message: "changed",
					},
				],
			},
		});

		// Act
		const stages = evaluation.evaluate(reports);
		const diagnostics = evaluation.diagnostics(reports);

		// Assert
		expect(
			stages.find((stage) => stage.owner === "communications"),
		).toMatchObject({
			outcome: "success",
			blocked: false,
			prerequisiteBlocked: true,
		});
		expect(diagnostics).toEqual([]);
	});
});
