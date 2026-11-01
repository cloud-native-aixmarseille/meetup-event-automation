import { describe, expect, it } from "vitest";
import { fixture, request } from "../testing/approval.fixtures.js";
import type { FinalizeApprovalDecision } from "./finalize-approval-decision.js";

describe("follow-up comment completion", () => {
	it.each([
		{
			pendingTasks: ["share-slides"] as const,
			uncertain: false,
			resolved: false,
		},
		{ pendingTasks: [], uncertain: true, resolved: false },
		{ pendingTasks: [], uncertain: false, resolved: true },
	])(
		"preserves remaining work: %j",
		async ({ pendingTasks, uncertain, resolved }) => {
			// Arrange
			const f = fixture();
			const record = f.records.create({ ...request, kind: "email-thanks" });
			record.decision = {
				status: "approved",
				actor: "organizer",
				decidedAt: request.requestedAt,
			};
			record.followUp = {
				active: true,
				pendingTasks,
				attention: "encoded-attention",
			};
			f.attentionCodec.read.mockReturnValue({
				eventDate: request.eventDate,
				stopped: false,
				episodes: [],
				...(uncertain ? { post: { status: "pending" } } : {}),
			});
			const persisted = await f.repository.save(record);
			const finalizer: FinalizeApprovalDecision = f.finalizer;

			// Act
			await finalizer.refreshVisibility(persisted);

			// Assert
			expect(f.visibility.synchronize).toHaveBeenCalledWith(
				persisted.comment.id,
				persisted.comment.body,
				resolved,
			);
			expect(persisted.record.decision).toEqual(record.decision);
		},
	);
});
