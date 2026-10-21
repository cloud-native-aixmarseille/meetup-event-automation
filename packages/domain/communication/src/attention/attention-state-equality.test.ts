import { describe, expect, it } from "vitest";
import { condition } from "../../testing/attention.fixtures.js";
import { AttentionStateEquality } from "./attention-state-equality.js";
import type { AttentionState } from "./model.js";

const state: AttentionState = {
	eventDate: "2099-06-08",
	stopped: false,
	episodes: [
		{
			condition: condition(),
			episode: 1,
			openedAt: "2099-06-01T10:00:00Z",
			status: "active",
		},
		{
			condition: condition({
				key: "missing-date:date",
				code: "missing-date",
				resource: "date",
			}),
			episode: 1,
			openedAt: "2099-06-01T10:00:00Z",
			status: "active",
		},
	],
	post: {
		reservationId: "attention:1:1",
		day: 1,
		reservedAt: "2099-06-01T10:00:00Z",
		status: "pending",
	},
};
describe("attention state equivalence", () => {
	it("ignores episode order and omitted optional fields", () => {
		// Arrange
		const right = {
			...structuredClone(state),
			commentId: undefined,
			episodes: [...state.episodes].reverse(),
		};

		// Act
		const same = AttentionStateEquality.equal(state, right);

		// Assert
		expect(same).toBe(true);
	});
	it.each(["status", "reservation", "episode", "condition", "eventDate"])(
		"distinguishes changed %s authority",
		(field) => {
			// Arrange
			const right = structuredClone(state);
			if (field === "status") right.episodes[0].status = "unknown";
			if (field === "reservation" && right.post)
				right.post = { ...right.post, reservationId: "attention:2:2" };
			if (field === "episode") right.episodes[0].episode = 2;
			if (field === "condition")
				right.episodes[0].condition = {
					...right.episodes[0].condition,
					recovery: true,
				};
			if (field === "eventDate") right.eventDate = "2099-06-09";

			// Act
			const same = AttentionStateEquality.equal(state, right);

			// Assert
			expect(same).toBe(false);
		},
	);
});
