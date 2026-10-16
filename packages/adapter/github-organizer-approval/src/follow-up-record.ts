import { FOLLOW_UP_TASKS, type FollowUpTask } from "@meetup-automation/journey";
export interface StoredFollowUp {
	readonly active: boolean;
	readonly pendingTasks: readonly FollowUpTask[];
	readonly attention?: string;
	readonly attentionDetails?: string;
}
export class FollowUpRecord {
	static validate(value: StoredFollowUp | undefined): void {
		if (value === undefined) return;
		if (
			!value ||
			typeof value.active !== "boolean" ||
			!Array.isArray(value.pendingTasks) ||
			value.pendingTasks.length > FOLLOW_UP_TASKS.length ||
			new Set(value.pendingTasks).size !== value.pendingTasks.length ||
			value.pendingTasks.some((task) => !FOLLOW_UP_TASKS.includes(task)) ||
			(value.attention !== undefined &&
				(typeof value.attention !== "string" ||
					value.attention.length > 50000)) ||
			(value.attentionDetails !== undefined &&
				(typeof value.attentionDetails !== "string" ||
					value.attentionDetails.length > 20000))
		)
			throw new Error("Invalid post-event follow-up state");
	}
}
