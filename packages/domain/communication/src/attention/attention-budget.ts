export interface AttentionBudgetSlot {
	readonly key: string;
	readonly day: number;
	readonly status: "pending" | "accepted" | "retry";
}
export interface AttentionBudgetSnapshot {
	readonly version?: string;
	readonly slots: readonly AttentionBudgetSlot[];
}
export interface AttentionBudgetRepository {
	load(day: number): Promise<AttentionBudgetSnapshot>;
	/** Requires the shared-channel lock; false means the local snapshot changed. */
	save(
		previous: AttentionBudgetSnapshot,
		slots: readonly AttentionBudgetSlot[],
	): Promise<boolean>;
}
/** Bound to the shared channel and the current issue by composition. */
export interface AttentionBudget {
	reserve(reservationId: string, day: number): Promise<boolean>;
	settle(
		reservationId: string,
		day: number,
		outcome: "accepted" | "retry",
	): Promise<void>;
}
