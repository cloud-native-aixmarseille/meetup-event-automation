import { describe, expect, it } from "vitest";
import { AttentionStateRules } from "./attention-state-rules.js";
import type { AttentionState } from "./model.js";

const state: AttentionState = {
	eventDate: "",
	stopped: false,
	episodes: [],
};
const reservation = {
	reservationId: "attention:1:1",
	day: 1,
	reservedAt: "2099-06-01T10:00:00Z",
	status: "pending" as const,
};
describe("attention authority invariants", () => {
	it.each([
		{ ...reservation, status: "accepted" as const },
		{
			...reservation,
			message: { destination: "channel", messageId: "message" },
		},
		{ ...reservation, retryAt: "2099-06-02T10:00:00Z" },
		{ ...reservation, fingerprint: "fingerprint" },
	])("rejects contradictory reservation state %j", (post) => {
		// Arrange
		const value = { ...state, post };

		// Act
		const validate = () => new AttentionStateRules().validate(value);

		// Assert
		expect(validate).toThrow();
	});
	it("accepts an opaque confirmed provider reference", () => {
		// Arrange
		const value: AttentionState = {
			...state,
			post: {
				...reservation,
				status: "accepted",
				message: { destination: "channel", messageId: "message" },
			},
		};

		// Act
		const validate = () => new AttentionStateRules().validate(value);

		// Assert
		expect(validate).not.toThrow();
	});
});
