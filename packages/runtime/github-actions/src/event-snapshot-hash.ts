import { createHash } from "node:crypto";
import type { EventDocument } from "@meetup-automation/event";
import type { EventDocumentRevision } from "@meetup-automation/journey";

export class EventSnapshotHash implements EventDocumentRevision {
	of(document: EventDocument): string {
		return createHash("sha256")
			.update(
				JSON.stringify([
					document.identity.repository,
					document.identity.issueNumber,
					document.issueState,
					document.issueTitle,
					[...document.labels].sort(),
					document.body,
				]),
			)
			.digest("hex");
	}
}
