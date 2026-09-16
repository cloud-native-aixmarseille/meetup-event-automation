import type { EventDiagnostic } from "./diagnostic.js";
import {
	type EventLifecycleState,
	type MeetupEvent,
	MeetupEventOperations,
} from "./model.js";
import type { EventReadiness } from "./readiness.js";

export type EventLifecycleEvaluation = Readonly<{
	state: EventLifecycleState;
	evaluatedAt: string;
	timeZone: string;
	diagnostics: readonly EventDiagnostic[];
}>;

export type EvaluateEventLifecycleInput = Readonly<{
	event: MeetupEvent;
	readiness: EventReadiness;
	now: string;
}>;

export class EventLifecycle {
	/**
	 * Derives lifecycle exclusively from event facts and an explicitly supplied
	 * instant. In particular, a past date never implies that an event was held.
	 */
	static evaluateEventLifecycle({
		event,
		readiness,
		now,
	}: EvaluateEventLifecycleInput): EventLifecycleEvaluation {
		let state: EventLifecycleState;

		switch (event.occurrenceStatus) {
			case "cancelled":
				state = "cancelled";
				break;
			case "postponed":
				state = "postponed";
				break;
			case "held":
				state =
					event.followUpComplete &&
					MeetupEventOperations.postEventChecklistIsComplete(
						event.operationalChecklists.postEvent,
					)
						? "follow-up-complete"
						: "held";
				break;
			case "scheduled":
			case undefined:
				if (!EventLifecycle.hasMinimumPlanningFacts(event)) {
					state = "draft";
				} else {
					state = readiness.isReady ? "ready" : "planned";
				}
				break;
		}

		return {
			state,
			evaluatedAt: now,
			timeZone: event.timeZone,
			diagnostics: readiness.diagnostics,
		};
	}

	static hasMinimumPlanningFacts(event: MeetupEvent): boolean {
		return event.date.trim() !== "" && event.eventTitle.trim() !== "";
	}
}
