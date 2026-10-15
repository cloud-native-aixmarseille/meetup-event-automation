import { describe, expect, it } from "vitest";
import { RecoverAttentionPost } from "./recover-attention-post.js";
import type { AttentionState } from "./model.js";
describe("explicit attention recovery", () => {
	it.each(["accepted", "not-accepted"] as const)(
		"records verified %s without resetting email state",
		(outcome) => {
			// Arrange
			const state: AttentionState = {
				version: 1,
				eventDate: "",
				stopped: true,
				episodes: [],
				post: {
					reservationId: "attention:1:2",
					day: 1,
					reservedAt: "2099-06-01T10:00:00Z",
					status: "pending",
				},
			};
			// Act
			RecoverAttentionPost.apply(
				state,
				{
					reservationId: "attention:1:2",
					outcome,
					message: { destination: "C123", messageId: "123.456" },
				},
				new Date("2099-06-02T10:00:00Z"),
			);
			// Assert
			expect(state.post?.status).toBe(
				outcome === "accepted" ? "accepted" : "retry",
			);
		},
	);
	it("rejects stale recovery commands", () => {
		// Arrange
		const state: AttentionState = {
			version: 1,
			eventDate: "",
			stopped: true,
			episodes: [],
			post: {
				reservationId: "attention:1:2",
				day: 1,
				reservedAt: "2099-06-01T10:00:00Z",
				status: "pending",
			},
		};
		// Act
		const recover = () =>
			RecoverAttentionPost.apply(
				state,
				{ reservationId: "attention:1:1", outcome: "not-accepted" },
				new Date("2099-06-02T10:00:00Z"),
			);
		// Assert
		expect(recover).toThrow("current pending");
		expect(state.post?.status).toBe("pending");
	});
});
