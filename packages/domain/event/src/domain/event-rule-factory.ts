import { EventAgendaRule } from "./event-agenda-rule.js";
import { EventDateRule } from "./event-date-rule.js";
import { EventDescriptionRule } from "./event-description-rule.js";
import { EventHostRule } from "./event-host-rule.js";
import { EventLinksRule } from "./event-links-rule.js";
import { EventTitleRule } from "./event-title-rule.js";
import { IssueTitleRule } from "./issue-title-rule.js";
import { ManagedLabelsRule } from "./managed-labels-rule.js";
import {
	DEFAULT_MANAGED_LABEL_CONFIGURATION,
	type EventRule,
	type ManagedLabelConfiguration,
} from "./rule-contracts.js";

export class EventRuleFactory {
	static createDefaultEventRules(
		labelConfiguration: ManagedLabelConfiguration = DEFAULT_MANAGED_LABEL_CONFIGURATION,
	): readonly EventRule[] {
		return [
			new EventDateRule(),
			new EventTitleRule(),
			new EventDescriptionRule(),
			new EventHostRule(),
			new EventAgendaRule(),
			new EventLinksRule(),
			new IssueTitleRule(),
			new ManagedLabelsRule(labelConfiguration),
		];
	}
}
