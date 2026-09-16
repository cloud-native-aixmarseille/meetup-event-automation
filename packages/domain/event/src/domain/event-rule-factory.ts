import { EventDiagnostics } from "./diagnostic.js";
import { EventAgendaRule } from "./event-agenda-rule.js";
import { EventDateRule } from "./event-date-rule.js";
import { EventDescriptionRule } from "./event-description-rule.js";
import { EventHostRule } from "./event-host-rule.js";
import { EventLinksRule } from "./event-links-rule.js";
import { EventParticipantNormalization } from "./event-participant-normalization.js";
import { EventTitleRule } from "./event-title-rule.js";
import { IssueTitleRule } from "./issue-title-rule.js";
import { ManagedLabelsRule } from "./managed-labels-rule.js";
import {
	EMPTY_EVENT_PATCH,
	EventPatches,
	type EventPatchOperation,
} from "./patch.js";
import {
	DEFAULT_MANAGED_LABEL_CONFIGURATION,
	type EventRule,
	type EventRuleResult,
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

	static labelsMatch(
		actual: readonly string[],
		expected: readonly string[],
	): boolean {
		return (
			EventParticipantNormalization.arraysEqual(actual, expected) ||
			EventRuleFactory.sameMembers(actual, expected)
		);
	}

	static sameMembers(
		left: readonly string[],
		right: readonly string[],
	): boolean {
		return (
			left.length === right.length &&
			left.every((label) => right.includes(label))
		);
	}

	static emptyResult(): EventRuleResult {
		return { diagnostics: [], patch: EMPTY_EVENT_PATCH };
	}

	static normalizedResult(
		operation: EventPatchOperation,
		code: string,
		field: string,
		message: string,
	): EventRuleResult {
		return {
			diagnostics: [
				EventDiagnostics.diagnostic({
					code,
					severity: "info",
					category: "normalization",
					field,
					message,
					fixAvailable: true,
				}),
			],
			patch: EventPatches.createEventPatch([operation]),
		};
	}

	static isHttpsUrl(value: string): boolean {
		try {
			return new URL(value).protocol === "https:";
		} catch {
			return false;
		}
	}
}
