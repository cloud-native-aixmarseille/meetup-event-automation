import { createHash } from "node:crypto";
import type {
	AttentionBudgetRepository,
	AttentionBudgetSlot,
	AttentionBudgetSnapshot,
} from "@meetup-automation/communication";
import type { AutomationStateRepository } from "@meetup-automation/journey";
import type { AttentionBudgetRecord } from "./attention-budget-record.js";
import type { GithubAttentionBudgetSource } from "./github-attention-budget-source.js";

/** Aggregate verified technical comments; only write this issue under both workflow locks. */
export class GithubAttentionBudget implements AttentionBudgetRepository {
	constructor(
		private readonly source: Pick<GithubAttentionBudgetSource, "issues">,
		private readonly createState: (
			issue: number,
		) => Pick<AutomationStateRepository, "read" | "write">,
		private readonly codec: Pick<AttentionBudgetRecord, "read" | "write">,
		private readonly issueNumber: number,
		private readonly channel: string,
	) {}
	async load(day: number): Promise<AttentionBudgetSnapshot> {
		const issues = new Set([
			this.issueNumber,
			...(await this.source.issues(day)),
		]);
		const slots: AttentionBudgetSlot[] = [];
		let version: string | undefined;
		for (const issue of issues) {
			const records = await this.createState(issue).read("attention");
			if (issue === this.issueNumber) version = this.digest(records);
			const entries = records.map((record) => this.codec.read(record));
			if (
				new Set(entries.map((entry) => entry.channel)).size !== entries.length
			)
				throw new Error("Duplicate channel attention budget");
			for (const entry of entries) {
				if (entry.slots.some((slot) => !slot.key.startsWith(`${issue}:`)))
					throw new Error("Attention budget belongs to another issue");
				if (entry.channel === this.channel) slots.push(...entry.slots);
			}
		}
		return { slots, version };
	}
	async save(
		previous: AttentionBudgetSnapshot,
		slots: readonly AttentionBudgetSlot[],
	): Promise<boolean> {
		const state = this.createState(this.issueNumber);
		const records = await state.read("attention");
		if (this.digest(records) !== previous.version) return false;
		const next = records.filter(
			(record) => this.codec.read(record).channel !== this.channel,
		);
		next.push(
			this.codec.write({
				channel: this.channel,
				slots: slots.filter((slot) =>
					slot.key.startsWith(`${this.issueNumber}:`),
				),
			}),
		);
		await state.write("attention", records, next);
		return true;
	}
	private digest(records: readonly string[]): string {
		return createHash("sha256").update(JSON.stringify(records)).digest("hex");
	}
}
