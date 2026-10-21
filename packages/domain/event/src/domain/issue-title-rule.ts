import { EventDateValidation } from "./event-date-validation.js";
import { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import { EventPatches } from "./patch.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export class IssueTitleRule implements EventRule {
	readonly id = "issue-title";
	readonly dependencies = ["event-date", "event-title"];

	evaluate(event: MeetupEvent): EventRuleResult {
		if (
			!EventDateValidation.isValidIsoDate(event.date) ||
			event.eventTitle === ""
		) {
			return EventRuleResults.emptyResult();
		}

		const expected = `[Meetup] - ${event.date} - ${event.eventTitle}`;
		if (event.issueTitle === expected) {
			return EventRuleResults.emptyResult();
		}

		return EventRuleResults.normalizedResult(
			EventPatches.replaceEventField(
				"issueTitle",
				expected,
				"Project canonical issue title",
			),
			"event.issue-title.normalized",
			"issueTitle",
			`Issue title should be "${expected}"`,
		);
	}
}
