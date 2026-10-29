import type { ScheduledEvent } from "./scheduled-event-ports.js";

/** Stable remote identity; a review or public URL alone does not prove publication. */
export type EventPublicationIdentity = Readonly<{
	id: string;
	reviewUrl: string;
	publicUrl?: string;
}>;

export type SavedEventPublication = Readonly<{
	identity: EventPublicationIdentity;
	status: "draft" | "published";
}>;

/** Asset writes recheck the source; event writes also reserve creation identity. */
export type PublicationWriteGuard = (
	effect: "asset" | "event",
) => Promise<void>;

export interface EventPublicationGateway<
	Event extends ScheduledEvent = ScheduledEvent,
> {
	inspect(reference: string): Promise<SavedEventPublication>;
	/** Create drafts only. Guard immediately before writing; journal identity before verification. */
	save(
		event: Event,
		identity: EventPublicationIdentity | undefined,
		beforeSubmit: PublicationWriteGuard,
		onSaved: (identity: EventPublicationIdentity) => Promise<void>,
	): Promise<SavedEventPublication>;
	/** Publish a verified existing draft after the final source and approval guard. */
	publish(
		event: Event,
		identity: EventPublicationIdentity,
		beforePublish: () => Promise<void>,
	): Promise<SavedEventPublication>;
}

export type PublicationRecord = Readonly<{
	identity?: EventPublicationIdentity;
}>;

/** Scoped to source event and destination. The caller holds the shared event lock. */
export interface PublicationJournal {
	load(): Promise<PublicationRecord | undefined>;
	reserve(): Promise<void>;
	record(identity: EventPublicationIdentity): Promise<void>;
}

export interface EventPublicationIdentityPolicy {
	valid(identity: EventPublicationIdentity): boolean;
	publicUrl(value: unknown): value is string;
}
