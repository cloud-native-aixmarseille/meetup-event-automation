import type { EventDiagnostic } from "./diagnostic.js";
import { EventRuleOrdering } from "./event-rule-ordering.js";
import type { MeetupEvent } from "./model.js";
import { EventPatches, type EventPatchOperation } from "./patch.js";
import type { EventRule, EventRuleEngineResult } from "./rule-contracts.js";

/** Validates and sorts the rule graph once, before any event is processed. */
export class EventRuleEngine {
	private readonly orderedRules: readonly EventRule[];

	constructor(rules: readonly EventRule[]) {
		this.orderedRules = EventRuleOrdering.sortRules(rules);
	}

	evaluate(event: MeetupEvent): EventRuleEngineResult {
		let normalizedEvent = event;
		const diagnostics: EventDiagnostic[] = [];
		const operations: EventPatchOperation[] = [];

		for (const rule of this.orderedRules) {
			const result = rule.evaluate(normalizedEvent);
			diagnostics.push(...result.diagnostics);
			operations.push(...result.patch.operations);
			normalizedEvent = EventPatches.applyEventPatch(
				normalizedEvent,
				result.patch,
			);
		}

		return {
			event: normalizedEvent,
			diagnostics: Object.freeze(diagnostics),
			patch: EventPatches.createEventPatch(operations),
		};
	}

	get ruleIds(): readonly string[] {
		return this.orderedRules.map((rule) => rule.id);
	}
}
