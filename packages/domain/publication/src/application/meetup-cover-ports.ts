import type { ContentMedia } from "../domain/content-media.js";
import type { ScheduledEvent } from "./scheduled-event-ports.js";

export type MeetupPublicationEvent = ScheduledEvent &
	Readonly<{ cover: ContentMedia }>;

/** A missing photo ID means an upload was reserved but its outcome is uncertain. */
export type MeetupCoverRecord = Readonly<{
	groupUrl: string;
	fingerprint: string;
	photoId?: string;
}>;

export interface MeetupCoverJournal {
	readCover(): Promise<MeetupCoverRecord | undefined>;
	reserveCover(record: Omit<MeetupCoverRecord, "photoId">): Promise<void>;
	recordCover(record: MeetupCoverRecord & { photoId: string }): Promise<void>;
}
