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
	readonly rules: readonly EventRule[];
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
			...this.collaborators.rules,
			this.collaborators.createManagedLabelsRule(labelConfiguration),
		];
	}
}
