import { type EventDiagnostic, EventDiagnostics } from "./diagnostic.js";
import {
	OCCURRENCE_STATUS_LABELS,
	OCCURRENCE_STATUSES,
} from "./dto-contracts.js";
import type { OccurrenceStatus } from "./model.js";

export class EventOccurrenceParser {
	static readOccurrenceStatus(
		labels: readonly string[],
		issueState: "open" | "closed",
		legacyValue: unknown,
		diagnostics: EventDiagnostic[],
	): OccurrenceStatus {
		const explicitStatuses = OCCURRENCE_STATUSES.filter((status) => {
			const label = OCCURRENCE_STATUS_LABELS[status];
			return label !== null && labels.includes(label);
		});

		if (explicitStatuses.length > 1) {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.occurrence-status.label-conflict",
					severity: "error",
					category: "invalid",
					field: "labels",
					message:
						"Occurrence status labels are mutually exclusive; keep only one of event:postponed, event:held, or event:cancelled",
				}),
			);
			return (
				explicitStatuses[0] ?? (issueState === "closed" ? "held" : "scheduled")
			);
		}

		if (explicitStatuses.length === 1) {
			return explicitStatuses[0];
		}

		const legacyStatus = EventOccurrenceParser.readLegacyOccurrenceStatus(
			legacyValue,
			diagnostics,
		);
		if (legacyStatus !== undefined) {
			return legacyStatus;
		}

		return issueState === "closed" ? "held" : "scheduled";
	}

	static readLegacyOccurrenceStatus(
		value: unknown,
		diagnostics: EventDiagnostic[],
	): OccurrenceStatus | undefined {
		if (value === undefined || value === null || value === "") {
			return undefined;
		}
		if (
			typeof value === "string" &&
			OCCURRENCE_STATUSES.includes(value as OccurrenceStatus)
		) {
			return value as OccurrenceStatus;
		}

		diagnostics.push(
			EventDiagnostics.diagnostic({
				code: "event.occurrence-status.invalid",
				severity: "error",
				category: "invalid",
				field: "event_status",
				message:
					"Occurrence status must be scheduled, postponed, held, or cancelled",
			}),
		);
		return undefined;
	}
}
