import { describe, expect, it, vi } from "vitest";
import { createStoredApproval } from "../testing/approval.fixtures.js";
import { emailReviewRequest } from "../testing/email-review.fixtures.js";
import type { ApprovalState, StoredApproval } from "./approval-state.js";
import { GithubEmailDeliveryReport } from "./github-email-delivery-report.js";

describe("email delivery report on the original review", () => {
	it("updates the original review before hiding the separate ledger", async () => {
		// Arrange
		const state: ApprovalState = {
			record: {
				...createStoredApproval(emailReviewRequest),
				decision: {
					status: "approved",
					actor: "organizer",
					decidedAt: emailReviewRequest.requestedAt,
				},
			},
			comment: { id: 100, body: "review" },
		};
		const save = vi.fn(async (record: StoredApproval) => ({
			...state,
			record,
		}));
		const visibility = { synchronize: vi.fn() };
		const source = {
			readEmailReport: vi.fn().mockResolvedValue({
				commentId: 200,
				body: "ledger",
				hasOtherDeliveries: false,
				entries: [{ kind: "host-introduction", status: "accepted" }],
			}),
		};
		const finalizer = { refreshVisibility: vi.fn() };
		const report = new GithubEmailDeliveryReport(
			{ states: vi.fn().mockResolvedValue([state]), save },
			source,
			finalizer,
			visibility,
		);
		// Act
		await report.synchronize();
		// Assert
		expect(save).toHaveBeenCalledWith(
			expect.objectContaining({
				decision: state.record.decision,
				delivery: [{ kind: "host-introduction", status: "accepted", count: 1 }],
			}),
			state,
		);
		expect(finalizer.refreshVisibility).toHaveBeenCalled();
		expect(visibility.synchronize).toHaveBeenCalledWith(200, "ledger", true);
		expect(save.mock.invocationCallOrder[0]).toBeLessThan(
			visibility.synchronize.mock.invocationCallOrder[0] ?? 0,
		);
	});
	it.each(["pending", "uncertain", "rejected"] as const)(
		"retains %s evidence and the number still awaiting dispatch",
		async (status) => {
			// Arrange
			const state: ApprovalState = {
				record: {
					...createStoredApproval({
						...emailReviewRequest,
						recipientCount: 2,
						details: {
							...emailReviewRequest.details,
							emails: [
								...emailReviewRequest.details.emails,
								...emailReviewRequest.details.emails,
							],
						},
					}),
					decision: {
						status: "approved",
						actor: "organizer",
						decidedAt: emailReviewRequest.requestedAt,
					},
				},
				comment: { id: 100, body: "review" },
			};
			const save = vi.fn(async (record: StoredApproval) => ({
				...state,
				record,
			}));
			const source = {
				readEmailReport: vi.fn().mockResolvedValue({
					commentId: 200,
					body: "ledger",
					hasOtherDeliveries: false,
					entries: [{ kind: "host-introduction", status }],
				}),
			};
			const report = new GithubEmailDeliveryReport(
				{ states: vi.fn().mockResolvedValue([state]), save },
				source,
				{ refreshVisibility: vi.fn() },
				{ synchronize: vi.fn() },
			);
			// Act
			await report.synchronize();
			// Assert
			expect(save.mock.calls[0]?.[0].delivery).toEqual([
				{ kind: "host-introduction", status, count: 1 },
				{ kind: "host-introduction", status: "not-sent", count: 1 },
			]);
		},
	);
	it("keeps the ledger visible if saving the original comment fails", async () => {
		// Arrange
		const state: ApprovalState = {
			record: {
				...createStoredApproval(emailReviewRequest),
				decision: {
					status: "approved",
					actor: "organizer",
					decidedAt: emailReviewRequest.requestedAt,
				},
			},
			comment: { id: 100, body: "review" },
		};
		const failure = new Error("Synthetic concurrent edit");
		const source = {
			readEmailReport: vi.fn().mockResolvedValue({
				commentId: 200,
				body: "ledger",
				hasOtherDeliveries: false,
				entries: [{ kind: "host-introduction", status: "accepted" }],
			}),
		};
		const visibility = { synchronize: vi.fn() };
		const report = new GithubEmailDeliveryReport(
			{
				states: vi.fn().mockResolvedValue([state]),
				save: vi.fn().mockRejectedValue(failure),
			},
			source,
			{ refreshVisibility: vi.fn() },
			visibility,
		);
		// Act
		const result = report.synchronize();
		// Assert
		await expect(result).rejects.toBe(failure);
		expect(visibility.synchronize).not.toHaveBeenCalled();
	});
	it.each([false, true])(
		"reopens delivery evidence without a matching email approval (other deliveries: %s)",
		async (hasOtherDeliveries) => {
			// Arrange
			const source = {
				readEmailReport: vi.fn().mockResolvedValue({
					commentId: 200,
					body: "ledger",
					hasOtherDeliveries,
					entries: [{ kind: "host-introduction", status: "uncertain" }],
				}),
			};
			const visibility = { synchronize: vi.fn() };
			const report = new GithubEmailDeliveryReport(
				{ states: vi.fn().mockResolvedValue([]), save: vi.fn() },
				source,
				{ refreshVisibility: vi.fn() },
				visibility,
			);
			// Act
			await report.synchronize();
			// Assert
			expect(visibility.synchronize).toHaveBeenCalledWith(200, "ledger", false);
		},
	);
});
