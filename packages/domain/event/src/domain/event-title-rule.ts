import { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export class EventTitleRule implements EventRule {
	readonly id = "event-title";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		const value = event.eventTitle.trim();
		if (value === "") {
			return EventRuleResults.missing(
				"event.title.missing",
				"eventTitle",
				"An event title is required",
			);
		}
		return EventRuleResults.normalizeString(
			event.eventTitle,
			value,
			"eventTitle",
			"Trim event title",
		);
	}
}
