import {
	AttentionBudgetPolicy,
	type AttentionBudgetSlot,
} from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import { SharedAttentionBudget } from "./shared-attention-budget.js";

function fixture() {
	let slots: readonly AttentionBudgetSlot[] = [];
	let version = 0;
	const repository = {
		load: vi.fn(async () => ({ version: String(version), slots })),
		save: vi.fn(
			async (
				previous: { version?: string },
				next: readonly AttentionBudgetSlot[],
			) => {
				if (previous.version !== String(version)) return false;
				slots = next;
				version += 1;
				return true;
			},
		),
	};
	return {
		repository,
		slots: () => slots,
		issue: (issue: number) =>
			new SharedAttentionBudget(new AttentionBudgetPolicy(), repository, issue),
	};
}
describe("shared attention budget orchestration", () => {
	it("enforces one budget across issue runs serialized by the channel lock", async () => {
		// Arrange
		const f = fixture();
		const results: boolean[] = [];
		// Act
		for (const issue of [1, 2, 3, 4]) {
			results.push(await f.issue(issue).reserve("attention:100:100", 100));
		}
		// Assert
		expect(results).toEqual([true, true, true, false]);
		expect(f.slots()).toHaveLength(3);
	});
	it("shares retries with the original reservation and releases dated capacity across a week boundary", async () => {
		// Arrange
		const f = fixture();
		const first = f.issue(1);
		// Act
		await first.reserve("attention:100:100", 100);
		await first.settle("attention:100:100", 100, "retry");
		await first.reserve("attention:100:100", 101);
		await first.settle("attention:100:100", 101, "accepted");
		const afterRetry = f.slots();
		await f.issue(2).reserve("attention:102:102", 102);
		await f.issue(3).reserve("attention:103:103", 103);
		const suppressed = await f.issue(4).reserve("attention:107:107", 107);
		const allowed = await f.issue(4).reserve("attention:108:108", 108);
		// Assert
		expect(afterRetry).toHaveLength(1);
		expect(afterRetry[0]).toMatchObject({ day: 101, status: "accepted" });
		expect(suppressed).toBe(false);
		expect(allowed).toBe(true);
	});
	it("rechecks eligibility after a changed snapshot", async () => {
		// Arrange
		const f = fixture();
		f.repository.save.mockResolvedValueOnce(false);
		// Act
		const allowed = await f.issue(1).reserve("attention:100:100", 100);
		// Assert
		expect(allowed).toBe(true);
		expect(f.repository.load).toHaveBeenCalledTimes(2);
		expect(f.slots()).toHaveLength(1);
	});
	it("fails closed when shared persistence stays unavailable", async () => {
		// Arrange
		const f = fixture();
		f.repository.save.mockResolvedValue(false);
		// Act
		const reservation = f.issue(1).reserve("attention:100:100", 100);
		// Assert
		await expect(reservation).rejects.toThrow("changed concurrently");
		expect(f.slots()).toEqual([]);
	});
});
