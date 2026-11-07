import {
	EVENT_TASK_NAMES,
	type MeetupEvent,
	type OperationalChecklistItem,
} from "./model.js";

export class MeetupPublicationChecklist {
	isPublished(
		event: Pick<MeetupEvent, "publicationLinks" | "operationalChecklists">,
	): boolean {
		const matches = event.operationalChecklists.communication.filter(
			(item) => item.name === EVENT_TASK_NAMES.publishMeetup,
		);
		return (
			Boolean(event.publicationLinks.meetup) &&
			matches.length === 1 &&
			matches[0]?.completed === true
		);
	}

	withStatus(event: MeetupEvent, published: boolean): MeetupEvent {
		const communication: OperationalChecklistItem[] = [];
		let found = false;
		for (const item of event.operationalChecklists.communication) {
			if (item.name !== EVENT_TASK_NAMES.publishMeetup) {
				communication.push(item);
				continue;
			}
			if (!found) communication.push({ name: item.name, completed: published });
			found = true;
		}
		if (!found)
			communication.push({
				name: EVENT_TASK_NAMES.publishMeetup,
				completed: published,
			});
		return {
			...event,
			operationalChecklists: { ...event.operationalChecklists, communication },
		};
	}
}
