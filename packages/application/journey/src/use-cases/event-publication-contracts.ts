import type {
	EventClock,
	EventDocumentCodec,
	EventRepository,
	MeetupEvent,
} from "@meetup-automation/event";
import type {
	EventPublicationGateway,
	EventPublicationIdentity,
	EventPublicationIdentityPolicy,
	PublicationJournal,
	SavedEventPublication,
	ScheduledEvent,
} from "@meetup-automation/publication";
import type { EventCopyApprovalGate } from "../event/event-copy-approval-gate.js";
import type {
	OrganizerApproval,
	OrganizerApprovalKind,
} from "../ports/organizer-approval.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { EventPublicationSource } from "./event-publication-source.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";

export type EventPublicationResult = Readonly<{
	status: "draft" | "updated" | "skipped" | "blocked";
	reviewUrl?: string;
	diagnostics: readonly PublicDiagnostic[];
}>;
export type PublicationDestinationKey = Readonly<{
	provider: string;
	target: string;
}>;
export interface PublicationDestination {
	readonly key: PublicationDestinationKey;
	readonly field: "meetup" | "community";
	reconcile(source: EventPublicationSource): Promise<EventPublicationResult>;
	blocked(reason: string): EventPublicationResult;
}
export type EventPublicationsResult = Readonly<{
	publications: readonly (EventPublicationResult & {
		destination: PublicationDestinationKey;
	})[];
	diagnostics: readonly PublicDiagnostic[];
}>;
export type EventPublicationSourceDependencies = {
	repository: EventRepository;
	codec: EventDocumentCodec;
	clock: EventClock;
	manageEvent: Pick<ManageMeetupEvent, "execute">;
	contentGate: Pick<EventCopyApprovalGate, "blocked">;
};
export type EventPublicationConfiguration<
	Event extends ScheduledEvent,
	Settings,
> = {
	key: PublicationDestinationKey;
	field: "meetup" | "community";
	label: string;
	approvalKind: Extract<
		OrganizerApprovalKind,
		"meetup-publication" | "community-publication"
	>;
	settings: Settings;
	projection: {
		create(event: MeetupEvent, settings: Settings): Event | undefined;
	};
	policy: { valid(event: Event, now: string): boolean };
	identityPolicy: EventPublicationIdentityPolicy;
	pendingRecovery: "verified-link" | "journal-identity";
	issueProjection: {
		apply(event: MeetupEvent, saved: SavedEventPublication): MeetupEvent;
	};
	revision: {
		of(
			event: Event,
			identity: EventPublicationIdentity,
			target: string,
		): string;
	};
	gateway: EventPublicationGateway<Event>;
	journal: PublicationJournal;
	approval: OrganizerApproval;
};
