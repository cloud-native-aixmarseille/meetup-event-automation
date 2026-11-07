import type { AttentionBudgetSlot } from "./attention-budget.js";

/** Three routine posts across all issues in seven Paris dates, including uncertain attempts. */
export class AttentionBudgetPolicy {
	reserve(
		slots: readonly AttentionBudgetSlot[],
		key: string,
		day: number,
	): readonly AttentionBudgetSlot[] | undefined {
		const retained = slots.filter((slot) => slot.day >= day - 6);
		const existing = retained.find((slot) => slot.key === key);
		if (existing?.status === "accepted") return undefined;
		const others = retained.filter((slot) => slot.key !== key);
		if (others.length >= 3) return undefined;
		return [...others, { key, day, status: "pending" }];
	}
	settle(
		slots: readonly AttentionBudgetSlot[],
		key: string,
		status: "accepted" | "retry",
	): readonly AttentionBudgetSlot[] {
		const existing = slots.find((slot) => slot.key === key);
		if (!existing || (existing.status === "accepted" && status !== "accepted"))
			throw new Error("Invalid attention budget settlement");
		return slots.map((slot) => (slot.key === key ? { ...slot, status } : slot));
	}
}
