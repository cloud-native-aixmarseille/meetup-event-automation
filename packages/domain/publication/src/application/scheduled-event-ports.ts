export type ScheduledEvent = Readonly<{
	title: string;
	description: string;
	date: string;
	startTime: string;
	endTime: string;
	timeZone: string;
	venue: Readonly<{ name: string; city: string }>;
}>;

export type SavedScheduledEvent = Readonly<{
	url: string;
	status: "draft" | "published";
}>;

export interface ScheduledEventGateway {
	/**
	 * Create only drafts and preserve an existing event's publication status.
	 * Run the guard immediately before writing and record identity before verification.
	 */
	save(
		event: ScheduledEvent,
		url: string | undefined,
		beforeSubmit: () => Promise<void>,
		onSaved: (url: string) => Promise<void>,
	): Promise<SavedScheduledEvent>;
	/** Publish only a verified existing draft, after the guard rechecks organizer approval. */
	publish(
		event: ScheduledEvent,
		url: string,
		beforePublish: () => Promise<void>,
	): Promise<SavedScheduledEvent>;
}

export type PublicationRecord = Readonly<{ url?: string }>;

/** Scoped to one source event; callers hold the event concurrency lock. */
export interface PublicationJournal {
	load(): Promise<PublicationRecord | undefined>;
	reserve(): Promise<void>;
	record(url: string): Promise<void>;
}
