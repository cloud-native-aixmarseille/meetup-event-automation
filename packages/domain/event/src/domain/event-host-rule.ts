import { EventParticipantNormalization } from "./event-participant-normalization.js";
import { EventRuleFactory } from "./event-rule-factory.js";
import { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import { EventPatches } from "./patch.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export class EventHostRule implements EventRule {
	readonly id = "event-host";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		if (!event.host) {
			return EventRuleResults.missing(
				"event.hoster.missing",
				"host",
				"A host must be selected",
			);
		}

		const normalized = EventParticipantNormalization.normalizeParticipant(
			event.host,
		);
		if (normalized.displayName === "") {
			return EventRuleResults.invalid(
				"event.hoster.invalid",
				"host",
				"Host display name must not be empty",
			);
		}

		if (
			EventParticipantNormalization.participantsEqual(event.host, normalized)
		) {
			return EventRuleFactory.emptyResult();
		}

		return EventRuleFactory.normalizedResult(
			EventPatches.replaceEventField(
				"host",
				normalized,
				"Normalize host reference",
			),
			"event.hoster.normalized",
			"host",
			"The host reference can be normalized safely",
		);
	}
}
