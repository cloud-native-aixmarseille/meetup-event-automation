import type { FeedbackPolicy } from "./feedback-policy.js";

export type FeedbackLinkConflict = "ambiguous-date" | "current-event";
interface FeedbackEventFacts {
	readonly date: string;
	readonly isOpen: boolean;
	readonly occurrenceStatus:
		| "scheduled"
		| "held"
		| "cancelled"
		| "postponed"
		| "unknown"
		| undefined;
}

/** Keep the shared feedback destination on the active event until its day ends. */
export interface FeedbackLinkSelectionCollaborators {
	readonly feedbackPolicy: Pick<FeedbackPolicy, "isLinkUpdateDue">;
}

export class FeedbackLinkSelection {
	constructor(
		private readonly collaborators: FeedbackLinkSelectionCollaborators,
	) {}

	conflict(
		candidate: FeedbackEventFacts,
		targetDate: string,
		now: string,
		timeZone: string,
	): FeedbackLinkConflict | undefined {
		if (
			!candidate.isOpen ||
			candidate.occurrenceStatus === "cancelled" ||
			candidate.occurrenceStatus === "postponed"
		)
			return undefined;
		if (candidate.date === targetDate) return "ambiguous-date";
		if (
			candidate.date < targetDate &&
			this.collaborators.feedbackPolicy.isLinkUpdateDue(
				candidate.date,
				now,
				timeZone,
			)
		)
			return "current-event";
		return undefined;
	}
}
