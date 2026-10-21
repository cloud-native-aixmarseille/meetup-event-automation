import type { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export interface EventDescriptionRuleCollaborators {
	readonly eventRuleResults: Pick<
		EventRuleResults,
		"missing" | "normalizeString"
	>;
}

export class EventDescriptionRule implements EventRule {
	constructor(
		private readonly collaborators: EventDescriptionRuleCollaborators,
	) {}

	readonly id = "event-description";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		const value = event.description.trim();
		if (value === "") {
			return this.collaborators.eventRuleResults.missing(
				"event.description.missing",
				"description",
				"An event description is required",
			);
		}
		return this.collaborators.eventRuleResults.normalizeString(
			event.description,
			value,
			"description",
			"Trim event description",
		);
	}
}
