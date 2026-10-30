import type { EventCopyAgenda } from "./event-copy-agenda.js";
import type { EventCopyDescriptionFacts } from "./event-copy-facts.js";

export class EventCopyDescriptionDraft {
	constructor(
		private readonly agenda: Pick<EventCopyAgenda, "ready" | "source">,
	) {}
	ready(facts: EventCopyDescriptionFacts): boolean {
		return (
			this.agenda.ready(facts.talks) &&
			Boolean(
				facts.date && facts.startTime && facts.host.name && facts.host.city,
			)
		);
	}
	valid(facts: EventCopyDescriptionFacts, text: string): boolean {
		const projected = [
			text,
			...facts.talks.map((talk) =>
				[
					talk.title,
					talk.speakers.map((speaker) => speaker.name).join(", "),
					talk.abstract,
				]
					.filter(Boolean)
					.join("\n"),
			),
		].join("\n\n");
		return text.length <= 12000 && projected.length <= 49000;
	}
	source(facts: EventCopyDescriptionFacts): EventCopyDescriptionFacts {
		return {
			date: facts.date,
			startTime: facts.startTime,
			endTime: facts.endTime,
			timeZone: facts.timeZone,
			host: { name: facts.host.name, city: facts.host.city },
			talks: this.agenda.source(facts.talks).talks,
			aperitif: facts.aperitif,
		};
	}
	brief(
		facts: EventCopyDescriptionFacts,
		language: "en" | "fr",
		guidance: string,
	) {
		return {
			language,
			guidance,
			instructions: [
				"Write one concise description for a Cloud Native Aix-Marseille meetup using only the supplied facts. Use short, direct sentences and familiar words. No marketing hype, inflated promises, filler, or generic welcome paragraph.",
				"State the topic and confirmed date/time, host and city. Add Au programme : (or English equivalent), then the title, public speaker(s), and one factual teaser for each talk. End with at most one short invitation. Use emoji sparingly; omit decorative transitions.",
				"Return readable multiline text with actual line breaks. Separate the opening, practical details, programme heading, each talk, and closing invitation with a blank line. Put each talk's title and public speakers on one line and its teaser on the following line. Never return the whole description as one paragraph; do not use HTML or code blocks.",
				"Keep talk order and public speaker names. Maximum 12000 characters. Do not repeat full abstracts; publication appends them. Mention an aperitif only when aperitif=true. Never invent logistics, people or promises.",
			],
			facts: this.source(facts),
		};
	}
}
