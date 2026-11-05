import { describe, expect, it } from "vitest";
import {
	decision,
	fixture,
	request,
	publicationRequest,
	communityRequest,
} from "../testing/approval.fixtures.js";
import { socialPublicationRequest } from "../testing/social-publication.fixtures.js";
import type { FinalizeApprovalDecision } from "./finalize-approval-decision.js";

describe("verified publication authority", () => {
	it.each([socialPublicationRequest, publicationRequest, communityRequest])(
		"returns the persisted organizer identity for $kind",
		async (input) => {
			// Arrange
			const f = fixture();
			await f.repository.save(f.records.create(input));
			decision(f);
			const [pending] = await f.repository.states();
			if (!pending) throw new Error("Missing approval fixture");

			// Act
			const result = await f.finalizer.execute(pending);
			const [persisted] = await f.repository.states();
			if (!persisted) throw new Error("Missing persisted approval");
			const repeated = await f.finalizer.execute(persisted);

			// Assert
			const expected = {
				status: "approved",
				actor: "organizer",
				decidedAt: request.requestedAt,
			};
			expect(result).toMatchObject(expected);
			expect(repeated).toMatchObject(expected);
			expect(persisted.record.decision).toEqual(expected);
		},
	);
});

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
