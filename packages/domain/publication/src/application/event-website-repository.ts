export type WebsiteEvent = Readonly<{
	date: string;
	url: string;
	venue: Readonly<{ name: string; city: string }>;
}>;

/** Publish only the public facts of an event whose publication was verified. */
export interface EventWebsiteRepository {
	upsert(event: WebsiteEvent, beforeWrite: () => Promise<void>): Promise<void>;
}
