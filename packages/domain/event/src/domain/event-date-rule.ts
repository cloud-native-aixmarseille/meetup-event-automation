import type { EventDateValidation } from "./event-date-validation.js";
import type { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export interface EventDateRuleCollaborators {
	readonly eventRuleResults: Pick<
		EventRuleResults,
		"missing" | "invalid" | "normalizeString"
	>;
	readonly eventDateValidation: Pick<EventDateValidation, "isValidIsoDate">;
}

export class EventDateRule implements EventRule {
	constructor(private readonly collaborators: EventDateRuleCollaborators) {}

	readonly id = "event-date";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		const value = event.date.trim();
		if (value === "") {
			return this.collaborators.eventRuleResults.missing(
				"event.date.missing",
				"date",
				"An event date is required",
			);
		}
		if (!this.collaborators.eventDateValidation.isValidIsoDate(value)) {
			return this.collaborators.eventRuleResults.invalid(
				"event.date.invalid",
				"date",
				"Event date must be a real calendar date formatted as YYYY-MM-DD",
			);
		}
		return this.collaborators.eventRuleResults.normalizeString(
			event.date,
			value,
			"date",
			"Normalize event date",
		);
	}
}
