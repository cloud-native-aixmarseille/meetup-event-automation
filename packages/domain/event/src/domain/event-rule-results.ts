import type { EventDiagnostics } from "./diagnostic.js";
import {
	EMPTY_EVENT_PATCH,
	type EventPatches,
	type EventPatchOperation,
} from "./patch.js";
import type { EventRuleResult } from "./rule-contracts.js";

export interface EventRuleResultsCollaborators {
	readonly eventDiagnostics: Pick<EventDiagnostics, "diagnostic">;
	readonly eventPatches: Pick<
		EventPatches,
		"createEventPatch" | "replaceEventField"
	>;
}

export class EventRuleResults {
	constructor(private readonly collaborators: EventRuleResultsCollaborators) {}

	emptyResult(): EventRuleResult {
		return { diagnostics: [], patch: EMPTY_EVENT_PATCH };
	}

	normalizedResult(
		operation: EventPatchOperation,
		code: string,
		field: string,
		message: string,
	): EventRuleResult {
		return {
			diagnostics: [
				this.collaborators.eventDiagnostics.diagnostic({
					code,
					severity: "info",
					category: "normalization",
					field,
					message,
					fixAvailable: true,
				}),
			],
			patch: this.collaborators.eventPatches.createEventPatch([operation]),
		};
	}

	missing(code: string, field: string, message: string): EventRuleResult {
		return {
			diagnostics: [
				this.collaborators.eventDiagnostics.diagnostic({
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

	invalid(code: string, field: string, message: string): EventRuleResult {
		return {
			diagnostics: [
				this.collaborators.eventDiagnostics.diagnostic({
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

	normalizeString<P extends "eventTitle" | "date" | "description">(
		current: string,
		normalized: string,
		path: P,
		reason: string,
	): EventRuleResult {
		if (current === normalized) {
			return this.emptyResult();
		}
		return this.normalizedResult(
			this.collaborators.eventPatches.replaceEventField(
				path,
				normalized,
				reason,
			),
			`event.${path}.normalized`,
			path,
			`${path} can be normalized safely`,
		);
	}
}
