import { type EventDiagnostic, EventDiagnostics } from "./diagnostic.js";
import type { OccurrenceStatus } from "./model.js";
import {
	OCCURRENCE_STATUS_LABELS,
	OCCURRENCE_STATUSES,
} from "./occurrence-status.js";

export class EventOccurrenceParser {
	static readOccurrenceStatus(
		labels: readonly string[],
		issueState: "open" | "closed",
		fieldStatus: OccurrenceStatus | undefined,
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

		return fieldStatus ?? (issueState === "closed" ? "held" : "scheduled");
	}
}
