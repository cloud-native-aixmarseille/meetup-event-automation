import type { EventCopyAgenda } from "./event-copy-agenda.js";
import type { EventCopyTalk } from "./event-copy-facts.js";

/** The event title expresses the main reason to attend, independent of logistics. */
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
				"Write one clear, natural event headline for a Cloud Native Aix-Marseille meetup, at most 80 characters on one line. Make the main idea or practical benefit of attending immediately clear. No marketing hype, grand claims, or filler.",
				"Read the abstracts to identify what the talks actually promise. For one talk, capture its central challenge or takeaway in a memorable phrase. For several talks, find an honest shared theme without forcing a connection or listing every topic.",
				"Prefer concrete, active wording over a generic technology theme. Do not produce a keyword list, a stack inventory, an abstract summary, or a generic 'meetup about' label. Technologies mentioned only as pitfalls, counterexamples, or things to avoid must not become the headline promise.",
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
