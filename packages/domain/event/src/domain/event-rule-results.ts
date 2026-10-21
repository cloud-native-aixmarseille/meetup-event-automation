import { EventDiagnostics } from "./diagnostic.js";
import {
	EMPTY_EVENT_PATCH,
	EventPatches,
	type EventPatchOperation,
} from "./patch.js";
import type { EventRuleResult } from "./rule-contracts.js";

export class EventRuleResults {
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
			return EventRuleResults.emptyResult();
		}
		return EventRuleResults.normalizedResult(
			EventPatches.replaceEventField(path, normalized, reason),
			`event.${path}.normalized`,
			path,
			`${path} can be normalized safely`,
		);
	}
}
