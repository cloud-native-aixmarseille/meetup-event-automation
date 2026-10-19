import type { EventCopyAgenda } from "./event-copy-agenda.js";
import type { EventCopyTalk } from "./event-copy-facts.js";

/** The event title is a technology theme, independent of logistics. */
export class EventCopyTitleDraft {
	constructor(
		private readonly agenda: Pick<EventCopyAgenda, "ready" | "source">,
	) {}
	ready(talks: readonly EventCopyTalk[]): boolean {
		return this.agenda.ready(talks);
	}
	valid(text: string): boolean {
		return (
			text.length <= 80 && !/[\r\n]/.test(text) && !text.startsWith("[Meetup]")
		);
	}
	source(talks: readonly EventCopyTalk[]) {
		return this.agenda.source(talks);
	}
	brief(
		talks: readonly EventCopyTalk[],
		language: "en" | "fr",
		guidance: string,
	) {
		return {
			language,
			guidance,
			instructions: [
				"Write a short, specific technology theme for a Cloud Native Aix-Marseille meetup, at most 80 characters on one line.",
				"No [Meetup] prefix, date, venue or administrative wrapper. Use only the supplied topics. Do not invent technologies or claims.",
			],
			facts: {
				topics: talks.map((talk) => ({
					title: talk.title,
					abstract: talk.abstract,
				})),
			},
		};
	}
}
