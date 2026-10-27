import { describe, expect, it, vi } from "vitest";
import { attentionReports } from "../../testing/attention-reports.fixtures.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { ReconcileOrganizerFeedback } from "./reconcile-organizer-feedback.js";

describe("merged organizer feedback reconciliation", () => {
	it("refreshes social tasks independently when other stages were not evaluated", async () => {
		// Arrange
		const events = {
			find: vi.fn().mockResolvedValue({ labels: ["meetup"] }),
			applyPatch: vi.fn(),
			listPage: vi.fn(),
		};
		const comments = { reconcileDiagnostics: vi.fn() };
		const useCase = new ReconcileOrganizerFeedback(
			{
				attentionStageEvaluation:
					new JourneyPolicyComposition().attentionStageEvaluation(),
			},
			events,
			comments,
			"meetup",
		);
		const identity = { repository: "example/meetups", issueNumber: 42 };
		const diagnostic = {
			code: "communication.social.uncertain",
			severity: "warning" as const,
			message: "uncertain",
			field: "social.community.announcement",
		};

		// Act
		const result = await useCase.execute(
			identity,
			attentionReports({
				event: { outcome: "unknown", reported: false },
				social: { diagnostics: [diagnostic] },
			}),
		);

		// Assert
		expect(result).toEqual({ updated: true });
		expect(comments.reconcileDiagnostics).toHaveBeenCalledExactlyOnceWith(
			identity,
			[{ ...diagnostic, category: "incomplete" }],
			"social",
		);
	});
	it.each([
		{ outcome: "failure" as const },
		{ outcome: "unknown" as const },
		{ reported: false },
		{
			diagnostics: [
				{
					code: "communication.social.evaluation-failed",
					severity: "error" as const,
					message: "failed",
				},
			],
		},
		{
			diagnostics: [
				{
					code: "event.concurrently-modified",
					severity: "info" as const,
					message: "changed",
				},
			],
		},
		{
			diagnostics: [
				{
					code: "action.execution.failed",
					severity: "error" as const,
					message: "failed",
				},
			],
		},
	])(
		"preserves unresolved social tasks after an incomplete social run",
		async (social) => {
			// Arrange
			const events = { find: vi.fn(), applyPatch: vi.fn(), listPage: vi.fn() };
			const comments = { reconcileDiagnostics: vi.fn() };
			const useCase = new ReconcileOrganizerFeedback(
				{
					attentionStageEvaluation:
						new JourneyPolicyComposition().attentionStageEvaluation(),
				},
				events,
				comments,
				"meetup",
			);

			// Act
			const result = await useCase.execute(
				{ repository: "example/meetups", issueNumber: 42 },
				attentionReports({ event: { reported: false }, social }),
			);

			// Assert
			expect(result).toEqual({ updated: false });
			expect(comments.reconcileDiagnostics).not.toHaveBeenCalled();
		},
	);
	it.each([
		{ reported: false },
		{
			outcome: "failure" as const,
			diagnostics: [
				{
					code: "publication.assets.pdf.invalid",
					severity: "warning" as const,
					message: "PDF verification failed",
				},
			],
		},
	])(
		"preserves the previous checklist when asset evaluation is incomplete %#",
		async (assets) => {
			// Arrange
			const events = { find: vi.fn(), applyPatch: vi.fn(), listPage: vi.fn() };
			const comments = { reconcileDiagnostics: vi.fn() };
			const useCase = new ReconcileOrganizerFeedback(
				{
					attentionStageEvaluation:
						new JourneyPolicyComposition().attentionStageEvaluation(),
				},
				events,
				comments,
				"meetup",
			);

			// Act
			await useCase.execute(
				{ repository: "example/meetups", issueNumber: 42 },
				attentionReports({ assets }),
			);

			// Assert
			expect(events.find).not.toHaveBeenCalled();
			expect(comments.reconcileDiagnostics).not.toHaveBeenCalled();
		},
	);
});
