import type { EventDiagnostic } from "./diagnostic.js";
import type { MeetupEvent } from "./model.js";
import type { EventPatch } from "./patch.js";

export type EventRuleResult = Readonly<{
	diagnostics: readonly EventDiagnostic[];
	patch: EventPatch;
}>;

export interface EventRule {
	readonly id: string;
	readonly dependencies: readonly string[];
	evaluate(event: MeetupEvent): EventRuleResult;
}

export type EventRuleEngineResult = Readonly<{
	event: MeetupEvent;
	diagnostics: readonly EventDiagnostic[];
	patch: EventPatch;
}>;

export type ManagedLabelConfiguration = Readonly<{
	meetup: string;
	hostNeeded: string;
	hostConfirmed: string;
	speakersNeeded: string;
	speakersConfirmed: string;
	occurrencePostponed: string;
	occurrenceHeld: string;
	occurrenceCancelled: string;
}>;

export const DEFAULT_MANAGED_LABEL_CONFIGURATION: ManagedLabelConfiguration =
	Object.freeze({
		meetup: "meetup",
		hostNeeded: "hoster:needed",
		hostConfirmed: "hoster:confirmed",
		speakersNeeded: "speakers:needed",
		speakersConfirmed: "speakers:confirmed",
		occurrencePostponed: "event:postponed",
		occurrenceHeld: "event:held",
		occurrenceCancelled: "event:cancelled",
	});
