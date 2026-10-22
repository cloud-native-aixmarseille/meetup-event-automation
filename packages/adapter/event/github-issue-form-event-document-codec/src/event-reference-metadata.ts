import type {
	EventDiagnostic,
	EventDiagnostics,
	MeetupEvent,
} from "@meetup-automation/event";
import {
	type ParsedReferenceMetadata,
	REFERENCE_MARKER_NAME,
	type StableReferenceBinding,
	type StableReferenceMetadata,
} from "./github-issue-form-event-document-codec-contracts.js";
import type { ManagedIssueMarkers } from "./managed-issue-markers.js";
import type { ReferenceBindings } from "./reference-bindings.js";
import type { ReferenceMetadataShape } from "./reference-metadata-shape.js";

export interface EventReferenceMetadataCollaborators {
	readonly managedIssueMarkers: Pick<
		ManagedIssueMarkers,
		"readManagedMarkerValues"
	>;
	readonly eventDiagnostics: Pick<EventDiagnostics, "diagnostic">;
	readonly referenceMetadataShape: Pick<
		ReferenceMetadataShape,
		"isReferenceMetadata" | "isLegacyReferenceMetadata"
	>;
	readonly referenceBindings: Pick<
		ReferenceBindings,
		"restoreBoundReference" | "restoreBoundSpeaker" | "referenceBinding"
	>;
}

export class EventReferenceMetadata {
	constructor(
		private readonly collaborators: EventReferenceMetadataCollaborators,
	) {}

	readReferenceMetadata(
		body: string,
		diagnostics: EventDiagnostic[],
	): ParsedReferenceMetadata | undefined {
		const markers =
			this.collaborators.managedIssueMarkers.readManagedMarkerValues(
				body,
				REFERENCE_MARKER_NAME,
			);
		if (markers.length === 0) {
			return undefined;
		}
		if (markers.length > 1) {
			diagnostics.push(
				this.collaborators.eventDiagnostics.diagnostic({
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
			if (
				this.collaborators.referenceMetadataShape.isReferenceMetadata(parsed)
			) {
				return { kind: "bound", value: parsed };
			}
			if (
				this.collaborators.referenceMetadataShape.isLegacyReferenceMetadata(
					parsed,
				)
			) {
				return { kind: "legacy", value: parsed };
			}
			throw new Error("invalid metadata shape");
		} catch {
			diagnostics.push(
				this.collaborators.eventDiagnostics.diagnostic({
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

	applyReferenceMetadata(
		event: MeetupEvent,
		metadata: ParsedReferenceMetadata,
		diagnostics: EventDiagnostic[],
	): MeetupEvent {
		if (metadata.kind === "legacy") {
			diagnostics.push(this.legacyMetadataDiagnostic());
			return event;
		}

		const boundMetadata = metadata.value;
		const restored: MeetupEvent = {
			...event,
			host: this.collaborators.referenceBindings.restoreBoundReference(
				event.host,
				boundMetadata.host,
			),
			agenda: event.agenda.map((entry) => ({
				...entry,
				speakers: entry.speakers.map((speaker) =>
					this.collaborators.referenceBindings.restoreBoundSpeaker(
						speaker,
						boundMetadata.speakers,
					),
				),
			})),
		};

		if (
			!this.referenceMetadataEqual(
				boundMetadata,
				this.referenceMetadata(restored),
			)
		) {
			diagnostics.push(this.staleMetadataDiagnostic());
		}

		return restored;
	}

	referenceMetadata(event: MeetupEvent): StableReferenceMetadata {
		return {
			schemaVersion: 2,
			host: event.host?.id
				? this.collaborators.referenceBindings.referenceBinding(
						event.host,
						event.host.id,
					)
				: null,
			speakers: event.agenda.flatMap((entry) =>
				entry.speakers.flatMap((speaker) =>
					speaker.id
						? [
								this.collaborators.referenceBindings.referenceBinding(
									speaker,
									speaker.id,
								),
							]
						: [],
				),
			),
		};
	}

	referenceMetadataEqual(
		left: StableReferenceMetadata,
		right: StableReferenceMetadata,
	): boolean {
		return (
			this.sameBinding(left.host, right.host) &&
			left.speakers.length === right.speakers.length &&
			left.speakers.every((speaker, index) =>
				this.sameBinding(speaker, right.speakers[index]),
			)
		);
	}

	private sameBinding(
		left: StableReferenceBinding | null,
		right: StableReferenceBinding | null,
	): boolean {
		return left === null || right === null
			? left === right
			: left.id === right.id && left.displayName === right.displayName;
	}

	legacyMetadataDiagnostic(): EventDiagnostic {
		return this.collaborators.eventDiagnostics.diagnostic({
			code: "event.document.reference-metadata.legacy",
			severity: "warning",
			category: "migration",
			message:
				"Unbound stable reference metadata cannot safely restore participant IDs",
			fixAvailable: true,
		});
	}

	staleMetadataDiagnostic(): EventDiagnostic {
		return this.collaborators.eventDiagnostics.diagnostic({
			code: "event.document.reference-metadata.stale",
			severity: "warning",
			category: "migration",
			message: "Stable reference metadata does not match visible participants",
			fixAvailable: true,
		});
	}
}
