import type { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import type { EventPatches } from "./patch.js";
import type {
	EventRule,
	EventRuleResult,
	ManagedLabelConfiguration,
} from "./rule-contracts.js";

export interface ManagedLabelsRuleCollaborators {
	readonly eventRuleResults: Pick<
		EventRuleResults,
		"emptyResult" | "normalizedResult"
	>;
	readonly eventPatches: Pick<EventPatches, "replaceEventField">;
}

export class ManagedLabelsRule implements EventRule {
	readonly id = "managed-labels";
	readonly dependencies = ["event-host", "event-agenda"];

	constructor(
		private readonly collaborators: ManagedLabelsRuleCollaborators,
		private readonly configuration: ManagedLabelConfiguration,
	) {}

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
			...(event.confirmations.host
				? [this.configuration.hostConfirmed]
				: event.host?.displayName.trim()
					? []
					: [this.configuration.hostNeeded]),
			event.confirmations.speakers
				? this.configuration.speakersConfirmed
				: this.configuration.speakersNeeded,
			...occurrenceLabels,
		];

		if (this.labelsMatch(event.labels, expected)) {
			return this.collaborators.eventRuleResults.emptyResult();
		}

		return this.collaborators.eventRuleResults.normalizedResult(
			this.collaborators.eventPatches.replaceEventField(
				"labels",
				expected,
				"Project managed lifecycle labels",
			),
			"event.labels.normalized",
			"labels",
			"Managed meetup labels can be reconciled safely",
		);
	}
	private labelsMatch(
		actual: readonly string[],
		expected: readonly string[],
	): boolean {
		const sorted = [...expected].sort();
		return (
			actual.length === expected.length &&
			[...actual].sort().every((label, index) => label === sorted[index])
		);
	}
}
export type ManagedLabelsRuleArguments =
	ConstructorParameters<typeof ManagedLabelsRule> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
