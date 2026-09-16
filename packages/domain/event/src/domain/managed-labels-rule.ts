import { EventRuleFactory } from "./event-rule-factory.js";
import type { MeetupEvent } from "./model.js";
import { EventPatches } from "./patch.js";
import type {
	EventRule,
	EventRuleResult,
	ManagedLabelConfiguration,
} from "./rule-contracts.js";

export class ManagedLabelsRule implements EventRule {
	readonly id = "managed-labels";
	readonly dependencies = ["event-host", "event-agenda"];

	constructor(private readonly configuration: ManagedLabelConfiguration) {}

	evaluate(event: MeetupEvent): EventRuleResult {
		const managed = Object.values(this.configuration);
		const unmanaged = event.labels.filter((label) => !managed.includes(label));
		const occurrenceLabels =
			event.occurrenceStatus === "postponed"
				? [this.configuration.occurrencePostponed]
				: event.occurrenceStatus === "held"
					? [this.configuration.occurrenceHeld]
					: event.occurrenceStatus === "cancelled"
						? [this.configuration.occurrenceCancelled]
						: [];
		const expected = [
			...unmanaged,
			this.configuration.meetup,
			event.confirmations.host
				? this.configuration.hostConfirmed
				: this.configuration.hostNeeded,
			event.confirmations.speakers
				? this.configuration.speakersConfirmed
				: this.configuration.speakersNeeded,
			...occurrenceLabels,
		];

		if (EventRuleFactory.labelsMatch(event.labels, expected)) {
			return EventRuleFactory.emptyResult();
		}

		return EventRuleFactory.normalizedResult(
			EventPatches.replaceEventField(
				"labels",
				expected,
				"Project managed lifecycle labels",
			),
			"event.labels.normalized",
			"labels",
			"Managed meetup labels can be reconciled safely",
		);
	}
}
