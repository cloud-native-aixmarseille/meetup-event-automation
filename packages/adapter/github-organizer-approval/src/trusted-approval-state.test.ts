import { describe, expect, it } from "vitest";
import { decision, fixture, request } from "../testing/approval.fixtures.js";
import { ApprovalRecord } from "./approval-record.js";
import { TrustedApprovalState } from "./trusted-approval-state.js";

describe("trusted approval state", () => {
	it("ignores final decisions forged into a human-edited record", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		const record = ApprovalRecord.read(f.comments[0]?.body ?? "");
		decision(f, {
			body: f.presenter.issue(
				{
					...record,
					decision: {
						status: "approved",
						actor: "organizer",
						decidedAt: request.requestedAt,
					},
				},
				{ status: "approved" },
			),
		});
		const state = new TrustedApprovalState(f.client, "automation[bot]");
		// Act
		const trusted = await state.read(f.comments[0]);
		// Assert
		expect(trusted?.decision).toBeUndefined();
		expect(trusted?.requestId).toBe(record.requestId);
	});
	it("finds the original request when a human removes its marker", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f, { body: "Replaced text without metadata" });
		const state = new TrustedApprovalState(f.client, "automation[bot]");
		// Act
		const trusted = await state.read(f.comments[0]);
		// Assert
		expect(trusted).toMatchObject(request);
	});
	it.each(["deleted", "unavailable", "missing"])(
		"fails closed when trusted history is %s",
		async (failure) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(request);
			decision(f);
			f.history.set(
				"comment-100",
				failure === "missing"
					? []
					: [
							{
								diff: null,
								deletedAt: failure === "deleted" ? request.requestedAt : null,
								editor: { login: "automation", __typename: "Bot" },
							},
						],
			);
			const state = new TrustedApprovalState(f.client, "automation[bot]");
			// Act
			const operation = state.read(f.comments[0]);
			// Assert
			await expect(operation).rejects.toThrow();
		},
	);
});
