import type { FeedbackPolicy } from "./feedback-policy.js";

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

	select(
		candidates: readonly FeedbackEventFacts[],
		now: string,
		timeZone: string,
	): { index?: number; conflict?: "ambiguous-date" } {
		const due = candidates
			.map((event, index) => ({ event, index }))
			.filter(
				({ event }) =>
					event.isOpen &&
					!["cancelled", "postponed"].includes(event.occurrenceStatus ?? "") &&
					this.collaborators.feedbackPolicy.isLinkUpdateDue(
						event.date,
						now,
						timeZone,
					),
			)
			.sort((left, right) => left.event.date.localeCompare(right.event.date));
		const selected = due[0];
		if (!selected) return {};
		if (
			due.some(
				(candidate) =>
					candidate.index !== selected.index &&
					candidate.event.date === selected.event.date,
			)
		)
			return { conflict: "ambiguous-date" };
		return { index: selected.index };
	}
}
