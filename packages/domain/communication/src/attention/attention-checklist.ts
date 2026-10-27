export type AttentionChecklistField =
	| "date"
	| "host"
	| "host-confirmation"
	| "speaker-confirmation"
	| "meetup"
	| "community"
	| "agenda"
	| "other";
export type AttentionChecklistAction =
	| "email-approval"
	| "meetup-approval"
	| "community-approval"
	| "social-approval"
	| "delivery-recovery";
/** Public tasks decoded from the verified consolidated checklist. */
export interface AttentionChecklistEntry {
	readonly field: AttentionChecklistField;
	readonly label: string;
	readonly description: string;
	readonly action?: AttentionChecklistAction;
}
export interface AttentionChecklist {
	readonly commentId?: number;
	readonly entries: readonly AttentionChecklistEntry[];
}
export interface AttentionChecklistSource {
	read(): AttentionChecklist;
}
