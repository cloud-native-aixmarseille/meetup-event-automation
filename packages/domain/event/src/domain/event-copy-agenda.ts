import type { EventCopyTalk } from "./event-copy-facts.js";

export class EventCopyAgenda {
	ready(talks: readonly EventCopyTalk[]): boolean {
		return (
			talks.length > 0 &&
			talks.every(
				(talk) =>
					Boolean(talk.title.trim()) &&
					talk.speakers.length > 0 &&
					talk.speakers.every((speaker) =>
						Boolean(speaker.id && speaker.name.trim()),
					),
			)
		);
	}
	source(talks: readonly EventCopyTalk[]) {
		return {
			talks: talks.map((talk) => ({
				id: talk.id,
				title: talk.title,
				abstract: talk.abstract,
				speakers: talk.speakers.map((speaker) => ({
					id: speaker.id,
					name: speaker.name,
				})),
			})),
		};
	}
}
