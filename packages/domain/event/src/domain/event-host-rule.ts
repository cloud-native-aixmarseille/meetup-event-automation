import type { EventParticipantNormalization } from "./event-participant-normalization.js";
import type { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import type { EventPatches } from "./patch.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export interface EventHostRuleCollaborators {
	readonly eventRuleResults: Pick<
		EventRuleResults,
		"missing" | "invalid" | "emptyResult" | "normalizedResult"
	>;
	readonly eventParticipantNormalization: Pick<
		EventParticipantNormalization,
		"normalizeParticipant" | "participantsEqual"
	>;
	readonly eventPatches: Pick<EventPatches, "replaceEventField">;
}

export class EventHostRule implements EventRule {
	constructor(private readonly collaborators: EventHostRuleCollaborators) {}

	readonly id = "event-host";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		if (!event.host) {
			return this.collaborators.eventRuleResults.missing(
				"event.hoster.missing",
				"host",
				"A host must be selected",
			);
		}

		const normalized =
			this.collaborators.eventParticipantNormalization.normalizeParticipant(
				event.host,
			);
		if (normalized.displayName === "") {
			return this.collaborators.eventRuleResults.invalid(
				"event.hoster.invalid",
				"host",
				"Host display name must not be empty",
			);
		}

		if (
			this.collaborators.eventParticipantNormalization.participantsEqual(
				event.host,
				normalized,
			)
		) {
			return this.collaborators.eventRuleResults.emptyResult();
		}

		return this.collaborators.eventRuleResults.normalizedResult(
			this.collaborators.eventPatches.replaceEventField(
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
