import type {
	ContentFingerprint,
	ScheduledEvent,
} from "@meetup-automation/publication";

/** A fixed field order binds all public draft content without caller object order. */
export interface MeetupPublicationRevisionCollaborators {
	readonly contentFingerprint: Pick<ContentFingerprint, "of">;
}

export class MeetupPublicationRevision {
	constructor(
		private readonly collaborators: MeetupPublicationRevisionCollaborators,
	) {}

	of(event: ScheduledEvent, url: string): string {
		return this.collaborators.contentFingerprint.of(
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
