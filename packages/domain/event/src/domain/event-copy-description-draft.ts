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
				"Write one welcoming description for a Cloud Native Aix-Marseille meetup using only the supplied facts.",
				"Use plain semantic text: welcoming emoji opening; confirmed date/time, host and city and theme; Au programme : (or English equivalent); one emoji-led title - public speaker(s) and short teaser per talk; factual connecting sentence; friendly invitation.",
				"Keep talk order and public speaker names. Maximum 12000 characters. Do not repeat full abstracts; publication appends them. Mention an aperitif only when aperitif=true. Never invent logistics, people or promises.",
			],
			facts: this.source(facts),
		};
	}
}
