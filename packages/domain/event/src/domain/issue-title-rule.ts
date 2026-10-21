import type { EventDateValidation } from "./event-date-validation.js";
import type { EventRuleResults } from "./event-rule-results.js";
import type { MeetupEvent } from "./model.js";
import type { EventPatches } from "./patch.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export interface IssueTitleRuleCollaborators {
	readonly eventDateValidation: Pick<EventDateValidation, "isValidIsoDate">;
	readonly eventRuleResults: Pick<
		EventRuleResults,
		"emptyResult" | "normalizedResult"
	>;
	readonly eventPatches: Pick<EventPatches, "replaceEventField">;
}

export class IssueTitleRule implements EventRule {
	constructor(private readonly collaborators: IssueTitleRuleCollaborators) {}

	readonly id = "issue-title";
	readonly dependencies = ["event-date", "event-title"];

	evaluate(event: MeetupEvent): EventRuleResult {
		if (
			!this.collaborators.eventDateValidation.isValidIsoDate(event.date) ||
			event.eventTitle === ""
		) {
			return this.collaborators.eventRuleResults.emptyResult();
		}

		const expected = `[Meetup] - ${event.date} - ${event.eventTitle}`;
		if (event.issueTitle === expected) {
			return this.collaborators.eventRuleResults.emptyResult();
		}

		return this.collaborators.eventRuleResults.normalizedResult(
			this.collaborators.eventPatches.replaceEventField(
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
