import type {
	CommunityEvent,
	ContentFingerprint,
	EventPublicationIdentity,
} from "@meetup-automation/publication";

/** Canonical bytes include every managed field, creation choice, and scoped remote identity. */
export class CommunityPublicationRevision {
	constructor(private readonly fingerprint: Pick<ContentFingerprint, "of">) {}

	of(
		event: CommunityEvent,
		identity: EventPublicationIdentity,
		target: string,
	): string {
		return this.fingerprint.of(
			JSON.stringify({
				provider: "ocgroups",
				target,
				id: identity.id,
				reviewUrl: identity.reviewUrl,
				publicUrl: identity.publicUrl,
				...this.fields(event),
			}),
		);
	}
	content(event: CommunityEvent): string {
		return this.fingerprint.of(JSON.stringify(this.fields(event)));
	}
	private fields(event: CommunityEvent) {
		return {
			title: event.title,
			description: event.description,
			date: event.date,
			startTime: event.startTime,
			endTime: event.endTime,
			timeZone: event.timeZone,
			categoryId: event.categoryId,
			meetupUrl: event.meetupUrl,
			cover: {
				id: event.cover.id,
				fingerprint: event.cover.fingerprint,
				sourceRevision: event.cover.sourceRevision,
				mimeType: event.cover.mimeType,
				width: event.cover.width,
				height: event.cover.height,
			},
			speakers: event.speakers
				.map((speaker) => ({
					userId: speaker.userId,
					username: speaker.username,
				}))
				.sort((left, right) => left.userId.localeCompare(right.userId)),
			sponsor: {
				id: event.sponsor.id,
				name: event.sponsor.name,
				level: event.sponsor.level,
			},
			venue: {
				name: event.venue.name,
				address: event.venue.address,
				city: event.venue.city,
				zipCode: event.venue.zipCode,
				state: event.venue.state,
				country: event.venue.country,
				countryCode: event.venue.countryCode,
			},
			registration: {
				capacity: event.registration.capacity,
				waitlist: event.registration.waitlist,
				approvalRequired: event.registration.approvalRequired,
				reminder: event.registration.reminder,
			},
		};
	}
}
