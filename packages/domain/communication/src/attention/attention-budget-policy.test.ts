import { describe, expect, it } from "vitest";
import type { AttentionBudgetSlot } from "./attention-budget.js";
import { AttentionBudgetPolicy } from "./attention-budget-policy.js";

const slots: readonly AttentionBudgetSlot[] = [
	{ key: "1:attention:100:100", day: 100, status: "accepted" },
	{ key: "2:attention:101:101", day: 101, status: "pending" },
	{ key: "3:attention:102:102", day: 102, status: "retry" },
];
describe("shared routine notification budget", () => {
	it.each([100, 103, 106])(
		"holds confirmed, uncertain and retry slots through local date %s",
		(day) => {
			// Arrange
			const policy = new AttentionBudgetPolicy();
			// Act
			const next = policy.reserve(slots, "4:attention:103:103", day);
			// Assert
			expect(next).toBeUndefined();
		},
	);
	it("returns capacity when the oldest local date leaves the rolling window", () => {
		// Arrange
		const policy = new AttentionBudgetPolicy();
		// Act
		const next = policy.reserve(slots, "4:attention:107:107", 107);
		// Assert
		expect(next).toHaveLength(3);
		expect(next?.map((slot) => slot.key)).toEqual([
			slots[1].key,
			slots[2].key,
			"4:attention:107:107",
		]);
	});
	it.each(["pending", "retry"] as const)(
		"reuses a %s reservation without another slot",
		(status) => {
			// Arrange
			const policy = new AttentionBudgetPolicy();
			const previous = slots.map((slot, index) =>
				index === 1 ? { ...slot, status } : slot,
			);
			// Act
			const next = policy.reserve(previous, slots[1].key, 103);
			// Assert
			expect(next).toHaveLength(3);
			expect(next?.find((slot) => slot.key === slots[1].key)).toEqual({
				...slots[1],
				day: 103,
				status: "pending",
			});
		},
	);
	it("never grants an already accepted reservation again", () => {
		// Arrange
		const policy = new AttentionBudgetPolicy();
		// Act
		const next = policy.reserve(slots, slots[0].key, 103);
		// Assert
		expect(next).toBeUndefined();
	});
	it("records acceptance without changing the reservation date or other issues", () => {
		// Arrange
		const policy = new AttentionBudgetPolicy();
		// Act
		const next = policy.settle(slots, slots[1].key, "accepted");
		// Assert
		expect(next).toEqual([
			slots[0],
			{ ...slots[1], status: "accepted" },
			slots[2],
		]);
		expect(slots[1].status).toBe("pending");
	});
	it.each(["unknown", slots[0].key])(
		"rejects an invalid retry settlement for %s",
		(key) => {
			// Arrange
			const policy = new AttentionBudgetPolicy();
			// Act
			const settle = () => policy.settle(slots, key, "retry");
			// Assert
			expect(settle).toThrow("Invalid attention budget settlement");
		},
	);
});
