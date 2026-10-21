import {
	ContentFingerprint,
	type ScheduledEvent,
} from "@meetup-automation/publication";

/** A fixed field order binds all public draft content without caller object order. */
export class MeetupPublicationRevision {
	static of(event: ScheduledEvent, url: string): string {
		return ContentFingerprint.of(
			JSON.stringify({
				url,
				event: {
					title: event.title,
					description: event.description,
					date: event.date,
					startTime: event.startTime,
					endTime: event.endTime,
					timeZone: event.timeZone,
					venue: { name: event.venue.name, city: event.venue.city },
				},
			}),
		);
	}
}
