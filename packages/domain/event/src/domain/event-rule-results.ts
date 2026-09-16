import { EventDiagnostics } from "./diagnostic.js";
import { EventRuleFactory } from "./event-rule-factory.js";
import { EMPTY_EVENT_PATCH, EventPatches } from "./patch.js";
import type { EventRuleResult } from "./rule-contracts.js";

export class EventRuleResults {
	static missing(
		code: string,
		field: string,
		message: string,
	): EventRuleResult {
		return {
			diagnostics: [
				EventDiagnostics.diagnostic({
					code,
					severity: "warning",
					category: "incomplete",
					field,
					message,
				}),
			],
			patch: EMPTY_EVENT_PATCH,
		};
	}

	static invalid(
		code: string,
		field: string,
		message: string,
	): EventRuleResult {
		return {
			diagnostics: [
				EventDiagnostics.diagnostic({
					code,
					severity: "error",
					category: "invalid",
					field,
					message,
				}),
			],
			patch: EMPTY_EVENT_PATCH,
		};
	}

	static normalizeString<P extends "eventTitle" | "date" | "description">(
		current: string,
		normalized: string,
		path: P,
		reason: string,
	): EventRuleResult {
		if (current === normalized) {
			return EventRuleFactory.emptyResult();
		}
		return EventRuleFactory.normalizedResult(
			EventPatches.replaceEventField(path, normalized, reason),
			`event.${path}.normalized`,
			path,
			`${path} can be normalized safely`,
		);
	}
}
