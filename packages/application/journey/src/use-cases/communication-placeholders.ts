export class CommunicationPlaceholders {
	static eventPlaceholders(event: {
		readonly date: string;
		readonly publicationLinks: Readonly<{
			meetup?: string;
			community?: string;
			assets?: string;
		}>;
	}): Readonly<Record<string, string>> {
		return {
			eventDate: event.date,
			...(event.publicationLinks.meetup
				? { eventMeetupUrl: event.publicationLinks.meetup }
				: {}),
			...(event.publicationLinks.community
				? { eventCncfUrl: event.publicationLinks.community }
				: {}),
			...(event.publicationLinks.assets
				? { eventSlidesUrl: event.publicationLinks.assets }
				: {}),
		};
	}
}
