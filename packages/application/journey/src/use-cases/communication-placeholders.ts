import { PresentationFileUrl } from "@meetup-automation/publication";

export class CommunicationPlaceholders {
	static eventPlaceholders(
		event: {
			readonly date: string;
			readonly publicationLinks: Readonly<{
				meetup?: string;
				community?: string;
				assets?: string;
			}>;
		},
		slidesUrl?: string,
	): Readonly<Record<string, string>> {
		const presentationUrl = PresentationFileUrl.normalize(slidesUrl);
		return {
			eventDate: event.date,
			...(event.publicationLinks.meetup
				? { eventMeetupUrl: event.publicationLinks.meetup }
				: {}),
			...(event.publicationLinks.community
				? { eventCncfUrl: event.publicationLinks.community }
				: {}),
			...(presentationUrl ? { eventSlidesUrl: presentationUrl } : {}),
		};
	}
}
