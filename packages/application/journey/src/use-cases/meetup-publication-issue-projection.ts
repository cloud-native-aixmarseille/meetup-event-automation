import type {
	MeetupEvent,
	MeetupPublicationChecklist,
} from "@meetup-automation/event";
import type { SavedEventPublication } from "@meetup-automation/publication";
export class MeetupPublicationIssueProjection {
	constructor(
		private readonly checklist: Pick<MeetupPublicationChecklist, "withStatus">,
	) {}
	apply(event: MeetupEvent, saved: SavedEventPublication): MeetupEvent {
		return {
			...this.checklist.withStatus(event, saved.status === "published"),
			publicationLinks: {
				...event.publicationLinks,
				meetup: saved.identity.reviewUrl,
			},
		};
	}
}
