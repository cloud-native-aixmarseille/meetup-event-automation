import type { EventDiagnostic } from "./diagnostic.js";
import type { EventRuleOrdering } from "./event-rule-ordering.js";
import type { MeetupEvent } from "./model.js";
import type { EventPatches, EventPatchOperation } from "./patch.js";
import type { EventRule, EventRuleEngineResult } from "./rule-contracts.js";

/** Validates and sorts the rule graph once, before any event is processed. */
export interface EventRuleEngineCollaborators {
	readonly eventRuleOrdering: Pick<EventRuleOrdering, "sortRules">;
	readonly eventPatches: Pick<
		EventPatches,
		"applyEventPatch" | "createEventPatch"
	>;
}

export class EventRuleEngine {
	private readonly orderedRules: readonly EventRule[];

	constructor(
		private readonly collaborators: EventRuleEngineCollaborators,
		rules: readonly EventRule[],
	) {
		this.orderedRules = this.collaborators.eventRuleOrdering.sortRules(rules);
	}

	evaluate(event: MeetupEvent): EventRuleEngineResult {
		let normalizedEvent = event;
		const diagnostics: EventDiagnostic[] = [];
		const operations: EventPatchOperation[] = [];

		for (const rule of this.orderedRules) {
			const result = rule.evaluate(normalizedEvent);
			diagnostics.push(...result.diagnostics);
			operations.push(...result.patch.operations);
			normalizedEvent = this.collaborators.eventPatches.applyEventPatch(
				normalizedEvent,
				result.patch,
			);
		}

		return {
			event: normalizedEvent,
			diagnostics: Object.freeze(diagnostics),
			patch: this.collaborators.eventPatches.createEventPatch(operations),
		};
	}

	get ruleIds(): readonly string[] {
		return this.orderedRules.map((rule) => rule.id);
	}
}
export type EventRuleEngineArguments =
	ConstructorParameters<typeof EventRuleEngine> extends [unknown, ...infer Args]
		? Args
		: never;
