import { EventDateValidation } from "./event-date-validation.js";
import { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export class EventDateRule implements EventRule {
	readonly id = "event-date";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		const value = event.date.trim();
		if (value === "") {
			return EventRuleResults.missing(
				"event.date.missing",
				"date",
				"An event date is required",
			);
		}
		if (!EventDateValidation.isValidIsoDate(value)) {
			return EventRuleResults.invalid(
				"event.date.invalid",
				"date",
				"Event date must be a real calendar date formatted as YYYY-MM-DD",
			);
		}
		return EventRuleResults.normalizeString(
			event.date,
			value,
			"date",
			"Normalize event date",
		);
	}
}
