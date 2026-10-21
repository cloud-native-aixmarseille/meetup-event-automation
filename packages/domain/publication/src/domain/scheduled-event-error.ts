export type ScheduledEventFailure =
	| "approval-pending"
	| "approval-rejected"
	| "approval-unavailable"
	| "authentication"
	| "unavailable"
	| "editor"
	| "uncertain"
	| "verification";

export class ScheduledEventError extends Error {
	constructor(readonly kind: ScheduledEventFailure) {
		super(`Event publication failed: ${kind}`);
		this.name = "ScheduledEventError";
	}
}
