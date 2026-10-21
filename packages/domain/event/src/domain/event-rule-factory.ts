import type { EventAgendaRule } from "./event-agenda-rule.js";
import type { EventDateRule } from "./event-date-rule.js";
import type { EventDescriptionRule } from "./event-description-rule.js";
import type { EventHostRule } from "./event-host-rule.js";
import type { EventLinksRule } from "./event-links-rule.js";
import type { EventTitleRule } from "./event-title-rule.js";
import type { IssueTitleRule } from "./issue-title-rule.js";
import type {
	ManagedLabelsRule,
	ManagedLabelsRuleArguments,
} from "./managed-labels-rule.js";
import {
	DEFAULT_MANAGED_LABEL_CONFIGURATION,
	type EventRule,
	type ManagedLabelConfiguration,
} from "./rule-contracts.js";

export interface EventRuleFactoryCollaborators {
	readonly createEventDateRule: () => EventDateRule;
	readonly createEventTitleRule: () => EventTitleRule;
	readonly createEventDescriptionRule: () => EventDescriptionRule;
	readonly createEventHostRule: () => EventHostRule;
	readonly createEventAgendaRule: () => EventAgendaRule;
	readonly createEventLinksRule: () => EventLinksRule;
	readonly createIssueTitleRule: () => IssueTitleRule;
	readonly createManagedLabelsRule: (
		...args: ManagedLabelsRuleArguments
	) => ManagedLabelsRule;
}

export class EventRuleFactory {
	constructor(private readonly collaborators: EventRuleFactoryCollaborators) {}

	createDefaultEventRules(
		labelConfiguration: ManagedLabelConfiguration = DEFAULT_MANAGED_LABEL_CONFIGURATION,
	): readonly EventRule[] {
		return [
			this.collaborators.createEventDateRule(),
			this.collaborators.createEventTitleRule(),
			this.collaborators.createEventDescriptionRule(),
			this.collaborators.createEventHostRule(),
			this.collaborators.createEventAgendaRule(),
			this.collaborators.createEventLinksRule(),
			this.collaborators.createIssueTitleRule(),
			this.collaborators.createManagedLabelsRule(labelConfiguration),
		];
	}
}
