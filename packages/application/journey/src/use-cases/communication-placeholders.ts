import {
	type MeetupEvent,
	MeetupPublicationChecklist,
} from "@meetup-automation/event";
import { PresentationFileUrl } from "@meetup-automation/publication";

export class CommunicationPlaceholders {
	static eventPlaceholders(
		event: Pick<
			MeetupEvent,
			"date" | "publicationLinks" | "operationalChecklists"
		>,
		slidesUrl?: string,
	): Readonly<Record<string, string>> {
		const presentationUrl = PresentationFileUrl.normalize(slidesUrl);
		return {
			eventDate: event.date,
			...(MeetupPublicationChecklist.isPublished(event) &&
			event.publicationLinks.meetup
				? { eventMeetupUrl: event.publicationLinks.meetup }
				: {}),
			...(event.publicationLinks.community
				? { eventCncfUrl: event.publicationLinks.community }
				: {}),
			...(presentationUrl ? { eventSlidesUrl: presentationUrl } : {}),
		};
	}
}
