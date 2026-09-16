import {
	type EventDiagnostic,
	EventDiagnostics,
	type MeetupEvent,
} from "@meetup-automation/event";
import {
	type ParsedReferenceMetadata,
	REFERENCE_MARKER_NAME,
	type StableReferenceMetadata,
} from "./github-issue-form-event-document-codec-contracts.js";
import { ManagedIssueMarkers } from "./managed-issue-markers.js";
import { ReferenceBindings } from "./reference-bindings.js";
import { ReferenceMetadataShape } from "./reference-metadata-shape.js";

export class EventReferenceMetadata {
	static readReferenceMetadata(
		body: string,
		diagnostics: EventDiagnostic[],
	): ParsedReferenceMetadata | undefined {
		const markers = ManagedIssueMarkers.readManagedMarkerValues(
			body,
			REFERENCE_MARKER_NAME,
		);
		if (markers.length === 0) {
			return undefined;
		}
		if (markers.length > 1) {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.document.reference-metadata.duplicate",
					severity: "error",
					category: "invalid",
					message: "The event document contains duplicate reference metadata",
					fixAvailable: true,
				}),
			);
		}

		try {
			const parsed = JSON.parse(markers[0]) as unknown;
			if (ReferenceMetadataShape.isReferenceMetadata(parsed)) {
				return { kind: "bound", value: parsed };
			}
			if (ReferenceMetadataShape.isLegacyReferenceMetadata(parsed)) {
				return { kind: "legacy", value: parsed };
			}
			throw new Error("invalid metadata shape");
		} catch {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.document.reference-metadata.invalid",
					severity: "error",
					category: "invalid",
					message: "Stable reference metadata is malformed",
					fixAvailable: true,
				}),
			);
			return undefined;
		}
	}

	static applyReferenceMetadata(
		event: MeetupEvent,
		metadata: ParsedReferenceMetadata,
		diagnostics: EventDiagnostic[],
	): MeetupEvent {
		if (metadata.kind === "legacy") {
			diagnostics.push(EventReferenceMetadata.legacyMetadataDiagnostic());
			return event;
		}

		const boundMetadata = metadata.value;
		const restored: MeetupEvent = {
			...event,
			host: ReferenceBindings.restoreBoundReference(
				event.host,
				boundMetadata.host,
			),
			agenda: event.agenda.map((entry) => ({
				...entry,
				speakers: entry.speakers.map((speaker) =>
					ReferenceBindings.restoreBoundSpeaker(
						speaker,
						boundMetadata.speakers,
					),
				),
			})),
		};

		if (
			!EventReferenceMetadata.referenceMetadataEqual(
				boundMetadata,
				EventReferenceMetadata.referenceMetadata(restored),
			)
		) {
			diagnostics.push(EventReferenceMetadata.staleMetadataDiagnostic());
		}

		return restored;
	}

	static referenceMetadata(event: MeetupEvent): StableReferenceMetadata {
		return {
			schemaVersion: 2,
			host: event.host?.id
				? ReferenceBindings.referenceBinding(event.host, event.host.id)
				: null,
			speakers: event.agenda.flatMap((entry) =>
				entry.speakers.flatMap((speaker) =>
					speaker.id
						? [ReferenceBindings.referenceBinding(speaker, speaker.id)]
						: [],
				),
			),
		};
	}

	static referenceMetadataEqual(
		left: StableReferenceMetadata,
		right: StableReferenceMetadata,
	): boolean {
		return JSON.stringify(left) === JSON.stringify(right);
	}

	static legacyMetadataDiagnostic(): EventDiagnostic {
		return EventDiagnostics.diagnostic({
			code: "event.document.reference-metadata.legacy",
			severity: "warning",
			category: "migration",
			message:
				"Unbound stable reference metadata cannot safely restore participant IDs",
			fixAvailable: true,
		});
	}

	static staleMetadataDiagnostic(): EventDiagnostic {
		return EventDiagnostics.diagnostic({
			code: "event.document.reference-metadata.stale",
			severity: "warning",
			category: "migration",
			message: "Stable reference metadata does not match visible participants",
			fixAvailable: true,
		});
	}
}
