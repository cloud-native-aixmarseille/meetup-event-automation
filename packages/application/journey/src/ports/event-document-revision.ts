import type { EventDocument } from "@meetup-automation/event";

/** Opaque revision used to reject stale documents between workflow steps. */
export interface EventDocumentRevision {
	of(document: EventDocument): string;
}
