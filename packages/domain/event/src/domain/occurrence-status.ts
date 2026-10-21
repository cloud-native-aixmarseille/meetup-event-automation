import type { OccurrenceStatus } from "./model.js";

export const OCCURRENCE_STATUSES: readonly OccurrenceStatus[] = [
	"scheduled",
	"postponed",
	"held",
	"cancelled",
];

export const OCCURRENCE_STATUS_LABELS: Readonly<
	Record<OccurrenceStatus, string | null>
> = Object.freeze({
	scheduled: null,
	postponed: "event:postponed",
	held: "event:held",
	cancelled: "event:cancelled",
});
