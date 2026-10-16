import type { AttentionState } from "@meetup-automation/communication";

export const FOLLOW_UP_TASKS = [
	"thank-host",
	"thank-speakers",
	"share-slides",
	"import-attendance",
	"share-social",
] as const;
export type FollowUpTask = (typeof FOLLOW_UP_TASKS)[number];
export interface OrganizerFollowUpInput {
	readonly eventDate: string;
	readonly requestedAt: string;
	readonly active: boolean;
	readonly pendingTasks: readonly FollowUpTask[];
}
export interface OrganizerFollowUp {
	synchronizeFollowUp(
		input: OrganizerFollowUpInput,
	): Promise<number | undefined>;
}
/** Serialization stays with the attention adapter; the approval comment owns storage. */
export interface FollowUpAttentionPresentation {
	details(state: AttentionState): string;
}
export interface FollowUpAttentionCodec {
	read(body: string): AttentionState;
	marker(state: AttentionState): string;
}
