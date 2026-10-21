import type {
	MeetupEvent,
	MeetupPublicationChecklist,
} from "@meetup-automation/event";
import type { PresentationFileUrl } from "@meetup-automation/publication";

export interface CommunicationPlaceholdersCollaborators {
	readonly presentationFileUrl: Pick<PresentationFileUrl, "normalize">;
	readonly meetupPublicationChecklist: Pick<
		MeetupPublicationChecklist,
		"isPublished"
	>;
}

export class CommunicationPlaceholders {
	constructor(
		private readonly collaborators: CommunicationPlaceholdersCollaborators,
	) {}

	eventPlaceholders(
		event: Pick<
			MeetupEvent,
			"date" | "publicationLinks" | "operationalChecklists"
		>,
		slidesUrl?: string,
	): Readonly<Record<string, string>> {
		const presentationUrl =
			this.collaborators.presentationFileUrl.normalize(slidesUrl);
		return {
			eventDate: event.date,
			...(this.collaborators.meetupPublicationChecklist.isPublished(event) &&
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
