import type { AttentionBudgetSlot } from "@meetup-automation/communication";
import type { AttentionRecordFields } from "./attention-record-fields.js";

const MARKER = "<!-- meetup-attention-budget:v1 ";
export interface StoredAttentionBudget {
	readonly channel: string;
	readonly slots: readonly AttentionBudgetSlot[];
}
export class AttentionBudgetRecord {
	constructor(private readonly fields: AttentionRecordFields) {}
	read(body: string): StoredAttentionBudget {
		if (!body.startsWith(MARKER) || !body.endsWith(" -->"))
			throw new Error("Invalid attention budget record");
		const data = this.fields.record(JSON.parse(body.slice(MARKER.length, -4)));
		const channel = this.fields.text(data.channel, /^[CG][A-Z0-9]+$/);
		if (!Array.isArray(data.slots) || data.slots.length > 100)
			throw new Error("Invalid attention budget slots");
		const slots = data.slots.map((value): AttentionBudgetSlot => {
			const slot = this.fields.record(value);
			return {
				key: this.fields.text(slot.key, /^\d+:attention:\d+:\d+$/),
				day: this.fields.integer(slot.day, true),
				status: this.fields.choice(slot.status, [
					"pending",
					"accepted",
					"retry",
				]),
			};
		});
		if (new Set(slots.map((slot) => slot.key)).size !== slots.length)
			throw new Error("Duplicate attention budget slot");
		return { channel, slots };
	}
	write(record: StoredAttentionBudget): string {
		const body = `${MARKER}${JSON.stringify(record)} -->`;
		this.read(body);
		return body;
	}
}
