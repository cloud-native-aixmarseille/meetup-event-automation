import type { MeetupEvent } from "@meetup-automation/event";
import {
	type CommunityEvent,
	type CommunityRegistration,
	type CommunitySpeaker,
	type CommunitySponsor,
	type CommunityVenue,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { CoverArtworkApprovalGate } from "../assets/cover-artwork-approval-gate.js";
import type {
	ScheduledEventProjection,
	ScheduledEventSettings,
} from "./scheduled-event-projection.js";

export type CommunityPublicationSettings = ScheduledEventSettings &
	Readonly<{
		categoryId: string;
		registration: CommunityRegistration;
		venues: Readonly<Record<string, CommunityVenue>>;
		speakers: Readonly<Record<string, CommunitySpeaker>>;
		sponsors: Readonly<Record<string, CommunitySponsor>>;
	}>;

export class CommunityPublicationProjection {
	constructor(
		private readonly projection: Pick<ScheduledEventProjection, "create">,
		private readonly artwork: Pick<CoverArtworkApprovalGate, "cover">,
	) {}

	async create(
		event: MeetupEvent,
		settings: CommunityPublicationSettings,
	): Promise<CommunityEvent | undefined> {
		const schedule = this.projection.create(event, settings);
		const venue = event.host?.id ? settings.venues[event.host.id] : undefined;
		const sponsor = event.host?.id
			? settings.sponsors[event.host.id]
			: undefined;
		const meetupUrl = event.publicationLinks.meetup;
		const speakers = new Map<string, CommunitySpeaker>();
		for (const talk of event.agenda) {
			for (const speaker of talk.speakers) {
				const mapped = speaker.id ? settings.speakers[speaker.id] : undefined;
				if (!mapped) return undefined;
				speakers.set(mapped.userId, mapped);
			}
		}
		if (!schedule || !venue || !sponsor || !meetupUrl || !speakers.size)
			return undefined;
		const cover = await this.artwork.cover(event);
		if (!cover) throw new ScheduledEventError("content-review");
		return {
			...schedule,
			venue,
			categoryId: settings.categoryId,
			registration: settings.registration,
			meetupUrl,
			cover,
			sponsor,
			speakers: [...speakers.values()],
		};
	}
}
