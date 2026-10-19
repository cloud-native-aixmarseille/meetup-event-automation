import { describe, expect, it, vi } from "vitest";
import {
	contentFixture,
	media,
} from "../../testing/promotional-content.fixtures.js";
import { ContentReview } from "./content-review.js";

describe("content review", () => {
	it("records the decision and returns only the selected cover", async () => {
		// Arrange
		const f = contentFixture("cover");
		const second = {
			...media,
			id: "second-image",
			fingerprint: "b".repeat(64),
		};
		const draft = { text: "", media: [media, second] };
		const proposal = {
			...f.proposal,
			draft,
			revision: f.fingerprints.proposal(f.proposal, draft),
		};
		await f.store.save(await f.store.load(), [proposal]);
		const decision = {
			status: "approved" as const,
			actor: "organizer",
			decidedAt: "2026-09-21T12:00:00Z",
			selectedImage: second.id,
		};
		const approvals = {
			request: vi.fn(async () => ({ ...decision, notificationFailed: false })),
			synchronize: vi.fn(),
		};
		const review = new ContentReview(f.store, approvals, f.images, f.policy);
		// Act
		const approved = await review.approved(proposal, f.plan);
		const stored = await f.store.load();
		// Assert
		expect(approved).toEqual({ text: "", media: [second] });
		expect(stored.proposals[0]?.decision).toEqual(decision);
		expect(approvals.request).toHaveBeenCalledWith(
			expect.objectContaining({
				revision: proposal.revision,
				content: expect.objectContaining({ draft }),
			}),
		);
	});
	it("blocks changed image bytes before requesting or using approval", async () => {
		// Arrange
		const f = contentFixture("cover");
		const draft = { text: "", media: [media] };
		const proposal = {
			...f.proposal,
			draft,
			revision: f.fingerprints.proposal(f.proposal, draft),
		};
		f.images.verify.mockResolvedValue(false);
		const approvals = { request: vi.fn(), synchronize: vi.fn() };
		const review = new ContentReview(f.store, approvals, f.images, f.policy);
		// Act
		const status = await review.review(proposal, f.plan);
		// Assert
		expect(status).toBe("stale");
		expect(approvals.request).not.toHaveBeenCalled();
	});
	it("preserves pending work when an approval notification fails", async () => {
		// Arrange
		const f = contentFixture();
		const draft = { text: "A reviewed title", media: [] };
		const proposal = {
			...f.proposal,
			draft,
			revision: f.fingerprints.proposal(f.proposal, draft),
		};
		const approvals = {
			request: vi.fn(async () => ({
				status: "pending" as const,
				notificationFailed: true,
			})),
			synchronize: vi.fn(),
		};
		const review = new ContentReview(f.store, approvals, f.images, f.policy);
		// Act
		const result = review.review(proposal, f.plan);
		// Assert
		await expect(result).rejects.toThrow("notification failed");
		expect(f.store.save).not.toHaveBeenCalled();
	});
});
