import type {
	AttentionBudget,
	AttentionBudgetPolicy,
	AttentionBudgetRepository,
	AttentionBudgetSlot,
} from "@meetup-automation/communication";

/** Coordinates shared accounting under the channel lock; the domain owns eligibility. */
export class SharedAttentionBudget implements AttentionBudget {
	constructor(
		private readonly policy: Pick<AttentionBudgetPolicy, "reserve" | "settle">,
		private readonly repository: AttentionBudgetRepository,
		private readonly issueNumber: number,
	) {}
	async reserve(reservationId: string, day: number): Promise<boolean> {
		return this.change(day, (slots) =>
			this.policy.reserve(slots, this.key(reservationId), day),
		);
	}
	async settle(
		reservationId: string,
		day: number,
		outcome: "accepted" | "retry",
	): Promise<void> {
		await this.change(day, (slots) =>
			this.policy.settle(slots, this.key(reservationId), outcome),
		);
	}
	private key(reservationId: string): string {
		return `${this.issueNumber}:${reservationId}`;
	}
	private async change(
		day: number,
		update: (
			slots: readonly AttentionBudgetSlot[],
		) => readonly AttentionBudgetSlot[] | undefined,
	): Promise<boolean> {
		for (let attempt = 0; attempt < 5; attempt++) {
			const previous = await this.repository.load(day);
			const next = update(previous.slots);
			if (!next) return false;
			if (await this.repository.save(previous, next)) return true;
		}
		throw new Error("Shared attention budget changed concurrently");
	}
}
