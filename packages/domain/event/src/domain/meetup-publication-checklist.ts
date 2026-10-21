import type { MeetupEvent, OperationalChecklistItem } from "./model.js";

export class MeetupPublicationChecklist {
	static readonly taskName = "Meetup event published";

	static isPublished(
		event: Pick<MeetupEvent, "publicationLinks" | "operationalChecklists">,
	): boolean {
		const matches = event.operationalChecklists.communication.filter(
			(item) => item.name === MeetupPublicationChecklist.taskName,
		);
		return (
			Boolean(event.publicationLinks.meetup) &&
			matches.length === 1 &&
			matches[0]?.completed === true
		);
	}

	static withStatus(event: MeetupEvent, published: boolean): MeetupEvent {
		const communication: OperationalChecklistItem[] = [];
		let found = false;
		for (const item of event.operationalChecklists.communication) {
			if (item.name !== MeetupPublicationChecklist.taskName) {
				communication.push(item);
				continue;
			}
			if (!found) communication.push({ name: item.name, completed: published });
			found = true;
		}
		if (!found)
			communication.push({
				name: MeetupPublicationChecklist.taskName,
				completed: published,
			});
		return {
			...event,
			operationalChecklists: { ...event.operationalChecklists, communication },
		};
	}
}
