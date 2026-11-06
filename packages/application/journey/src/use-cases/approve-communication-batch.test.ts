import { OrganizerCommentChangedError } from "../approval/organizer-comment-changed-error.js";
import { describe, expect, it } from "vitest";
import { communicationReviewFixture } from "../../testing/communication-review.fixtures.js";
import { event } from "../../testing/meetup-journey.fixtures.js";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import { ApproveCommunicationBatch } from "./approve-communication-batch.js";

describe("preparation email review", () => {
	it("sends only the approved type with exactly its edited parameters", async () => {
		// Arrange
		const f = communicationReviewFixture();
		const edited = {
			...f.collaborators.parameters.project(f.input.mailPlaceholders ?? {}),
			eventDate: "2099-06-09",
		};
		f.approvals.request.mockImplementation(async (request) => ({
			status:
				request.details?.mailKind === "host-introduction"
					? "approved"
					: "pending",
			notificationFailed: false,
			...(request.details?.mailKind === "host-introduction"
				? { emailParameters: edited }
				: {}),
		}));
		const review = new ApproveCommunicationBatch(
			f.collaborators,
			f.approvals,
			f.clock,
			f.reconciler,
		);
		const diagnostics: CommunicationJourneyDiagnostic[] = [];
		// Act
		const batches = await review.execute(
			f.input,
			f.input.mailRecipients,
			event,
			diagnostics,
		);
		for (const batch of batches) await f.reconciler.execute(batch);
		// Assert
		expect(
			f.approvals.request.mock.calls.map(
				([request]) => request.details?.mailKind,
			),
		).toEqual(["host-introduction", "speaker-introduction"]);
		expect(f.gateway.dispatch).toHaveBeenCalledTimes(1);
		expect(f.gateway.dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "host-introduction",
				placeholders: expect.objectContaining(edited),
			}),
		);
		expect(JSON.stringify(f.approvals.request.mock.calls)).not.toContain(
			"private-host@example.test",
		);
		expect(JSON.stringify(f.approvals.request.mock.calls)).not.toContain(
			"Private contact",
		);
	});
	it("does not resend an accepted group when another group is approved later", async () => {
		// Arrange
		const f = communicationReviewFixture();
		f.approvals.request
			.mockResolvedValueOnce({ status: "approved", notificationFailed: false })
			.mockResolvedValueOnce({ status: "pending", notificationFailed: false })
			.mockResolvedValue({ status: "approved", notificationFailed: false });
		const review = new ApproveCommunicationBatch(
			f.collaborators,
			f.approvals,
			f.clock,
			f.reconciler,
		);
		// Act
		for (let run = 0; run < 2; run++) {
			const batches = await review.execute(
				f.input,
				f.input.mailRecipients,
				event,
				[],
			);
			for (const batch of batches) await f.reconciler.execute(batch);
		}
		// Assert
		expect(f.gateway.dispatch).toHaveBeenCalledTimes(2);
		expect(f.approvals.request).toHaveBeenCalledTimes(3);
		expect(f.approvals.request.mock.calls[1]?.[0].revision).toBe(
			f.approvals.request.mock.calls[2]?.[0].revision,
		);
	});
	it("rejects an override that attempts to change the recipient", async () => {
		// Arrange
		const f = communicationReviewFixture();
		f.approvals.request.mockResolvedValue({
			status: "approved",
			notificationFailed: false,
			emailParameters: { email: "attacker@example.test" },
		});
		const review = new ApproveCommunicationBatch(
			f.collaborators,
			f.approvals,
			f.clock,
			f.reconciler,
		);
		const diagnostics: CommunicationJourneyDiagnostic[] = [];
		// Act
		const batches = await review.execute(
			f.input,
			f.input.mailRecipients,
			event,
			diagnostics,
		);
		for (const batch of batches) await f.reconciler.execute(batch);
		// Assert
		expect(f.gateway.dispatch).not.toHaveBeenCalled();
		expect(diagnostics).toContainEqual({
			code: "communication.approval-unavailable",
			severity: "error",
		});
	});

	it("defers a changed approval without authorizing email dispatch", async () => {
		// Arrange
		const f = communicationReviewFixture();
		const changed = new OrganizerCommentChangedError();
		f.approvals.request.mockRejectedValue(changed);
		const review = new ApproveCommunicationBatch(
			f.collaborators,
			f.approvals,
			f.clock,
			f.reconciler,
		);
		const diagnostics: CommunicationJourneyDiagnostic[] = [];

		// Act
		const result = review.execute(
			f.input,
			f.input.mailRecipients,
			event,
			diagnostics,
		);

		// Assert
		await expect(result).rejects.toBe(changed);
		expect(f.gateway.dispatch).not.toHaveBeenCalled();
		expect(diagnostics).toEqual([]);
	});
});
