import type {
	ContentFingerprint,
	EventPublicationIdentity,
	MeetupPublicationEvent,
} from "@meetup-automation/publication";

/** A fixed field order binds all public draft content without caller object order. */
export interface MeetupPublicationRevisionCollaborators {
	readonly contentFingerprint: Pick<ContentFingerprint, "of">;
}

export class MeetupPublicationRevision {
	constructor(
		private readonly collaborators: MeetupPublicationRevisionCollaborators,
	) {}

	of(
		event: MeetupPublicationEvent,
		identity: EventPublicationIdentity,
	): string {
		return this.collaborators.contentFingerprint.of(
			JSON.stringify({
				url: identity.reviewUrl,
				event: this.fields(event),
			}),
		);
	}
	content(event: MeetupPublicationEvent): string {
		return this.collaborators.contentFingerprint.of(
			JSON.stringify(this.fields(event)),
		);
	}
	private fields(event: MeetupPublicationEvent) {
		return {
			title: event.title,
			description: event.description,
			date: event.date,
			startTime: event.startTime,
			endTime: event.endTime,
			timeZone: event.timeZone,
			venue: { name: event.venue.name, city: event.venue.city },
			cover: {
				id: event.cover.id,
				fingerprint: event.cover.fingerprint,
				sourceRevision: event.cover.sourceRevision,
			},
		};
	}
}
