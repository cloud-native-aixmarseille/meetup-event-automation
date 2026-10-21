import { describe, expect, it, vi } from "vitest";
import { attentionReports } from "../../testing/attention-reports.fixtures.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { ReconcileOrganizerFeedback } from "./reconcile-organizer-feedback.js";

describe("merged organizer feedback reconciliation", () => {
	it("does not read or clear the previous checklist until every stage is complete", async () => {
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
			attentionReports({ assets: { reported: false } }),
		);

		// Assert
		expect(events.find).not.toHaveBeenCalled();
		expect(comments.reconcileDiagnostics).not.toHaveBeenCalled();
	});
});
