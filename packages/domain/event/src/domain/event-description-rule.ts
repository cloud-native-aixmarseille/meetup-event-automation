import { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export class EventDescriptionRule implements EventRule {
	readonly id = "event-description";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		const value = event.description.trim();
		if (value === "") {
			return EventRuleResults.missing(
				"event.description.missing",
				"description",
				"An event description is required",
			);
		}
		return EventRuleResults.normalizeString(
			event.description,
			value,
			"description",
			"Trim event description",
		);
	}
}
