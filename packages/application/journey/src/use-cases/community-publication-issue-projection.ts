import type { MeetupEvent } from "@meetup-automation/event";
import type { SavedEventPublication } from "@meetup-automation/publication";
export class CommunityPublicationIssueProjection {
	apply(event: MeetupEvent, saved: SavedEventPublication): MeetupEvent {
		return {
			...event,
			publicationLinks: {
				...event.publicationLinks,
				community:
					saved.status === "published" ? saved.identity.publicUrl : undefined,
			},
		};
	}
}
