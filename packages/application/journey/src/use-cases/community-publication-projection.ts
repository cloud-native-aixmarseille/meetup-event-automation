import type { MeetupEvent } from "@meetup-automation/event";
import type {
	CommunityEvent,
	CommunityRegistration,
	CommunityVenue,
} from "@meetup-automation/publication";
import type {
	ScheduledEventProjection,
	ScheduledEventSettings,
} from "./scheduled-event-projection.js";

export type CommunityPublicationSettings = ScheduledEventSettings &
	Readonly<{
		categoryId: string;
		registration: CommunityRegistration;
		venues: Readonly<Record<string, CommunityVenue>>;
	}>;

export class CommunityPublicationProjection {
	constructor(
		private readonly projection: Pick<ScheduledEventProjection, "create">,
	) {}

	create(
		event: MeetupEvent,
		settings: CommunityPublicationSettings,
	): CommunityEvent | undefined {
		const schedule = this.projection.create(event, settings);
		const venue = event.host?.id ? settings.venues[event.host.id] : undefined;
		if (!schedule || !venue) return undefined;
		return {
			...schedule,
			venue,
			categoryId: settings.categoryId,
			registration: settings.registration,
		};
	}
}
