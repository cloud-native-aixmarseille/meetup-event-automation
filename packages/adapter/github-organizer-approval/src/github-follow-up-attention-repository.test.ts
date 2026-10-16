import { describe, expect, it, vi } from "vitest";
import type { AttentionState } from "@meetup-automation/communication";
import { GithubFollowUpAttentionRepository } from "./github-follow-up-attention-repository.js";

describe("follow-up attention persistence", () => {
	it("preserves the previous reservation when copying into the shared comment fails", async () => {
		// Arrange
		const state: AttentionState = {
			version: 1,
			eventDate: "2099-06-08",
			stopped: false,
			episodes: [],
			post: {
				reservationId: "attention:47268:4083991200000",
				day: 47268,
				reservedAt: "2099-06-01T10:00:00Z",
				status: "pending",
			},
		};
		const previous = {
			load: vi.fn().mockResolvedValue(state),
			save: vi.fn(),
			retire: vi.fn(),
		};
		const saveFollowUpAttention = vi
			.fn()
			.mockRejectedValue(new Error("GitHub write unavailable"));
		const repository = new GithubFollowUpAttentionRepository(
			{
				followUpAttention: vi.fn().mockResolvedValue({ commentId: 100 }),
				saveFollowUpAttention,
			},
			previous,
			{ read: vi.fn(), marker: vi.fn().mockReturnValue("serialized-state") },
			{ details: vi.fn().mockReturnValue("public-details") },
		);
		// Act
		const loaded = await repository.load();
		const save = repository.save(loaded as AttentionState);
		// Assert
		await expect(save).rejects.toThrow("GitHub write unavailable");
		expect(loaded?.post?.status).toBe("pending");
		expect(previous.retire).not.toHaveBeenCalled();
		expect(previous.save).not.toHaveBeenCalled();
	});
	it("fails closed on invalid shared state instead of restoring an older notification record", async () => {
		// Arrange
		const previous = {
			load: vi.fn().mockResolvedValue(undefined),
			save: vi.fn(),
			retire: vi.fn(),
		};
		const repository = new GithubFollowUpAttentionRepository(
			{
				followUpAttention: vi
					.fn()
					.mockResolvedValue({ commentId: 100, body: "invalid" }),
				saveFollowUpAttention: vi.fn(),
			},
			previous,
			{
				read: vi.fn(() => {
					throw new Error("Invalid attention state");
				}),
				marker: vi.fn(),
			},
			{ details: vi.fn() },
		);
		// Act
		const load = repository.load();
		// Assert
		await expect(load).rejects.toThrow("Invalid attention state");
		expect(previous.retire).not.toHaveBeenCalled();
	});
});
