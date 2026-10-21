import type { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export interface EventTitleRuleCollaborators {
	readonly eventRuleResults: Pick<
		EventRuleResults,
		"missing" | "normalizeString"
	>;
}

export class EventTitleRule implements EventRule {
	constructor(private readonly collaborators: EventTitleRuleCollaborators) {}

	readonly id = "event-title";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		const value = event.eventTitle.trim();
		if (value === "") {
			return this.collaborators.eventRuleResults.missing(
				"event.title.missing",
				"eventTitle",
				"An event title is required",
			);
		}
		return this.collaborators.eventRuleResults.normalizeString(
			event.eventTitle,
			value,
			"eventTitle",
			"Trim event title",
		);
	}
}
