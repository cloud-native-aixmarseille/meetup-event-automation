import type { ContentMedia } from "../domain/content-media.js";
import type { ScheduledEvent } from "./scheduled-event-ports.js";

export type CommunitySpeaker = Readonly<{ userId: string; username: string }>;
export type CommunitySponsor = Readonly<{
	id: string;
	name: string;
	level: string;
}>;

export type CommunityVenue = Readonly<{
	name: string;
	address: string;
	city: string;
	zipCode: string;
	state: string;
	country: string;
	countryCode: string;
}>;

export type CommunityRegistration = Readonly<{
	capacity: number;
	waitlist: boolean;
	approvalRequired: boolean;
	reminder: boolean;
}>;

export type CommunityEvent = ScheduledEvent &
	Readonly<{
		venue: CommunityVenue;
		categoryId: string;
		registration: CommunityRegistration;
		meetupUrl: string;
		cover: ContentMedia;
		speakers: readonly CommunitySpeaker[];
		sponsor: CommunitySponsor;
	}>;
