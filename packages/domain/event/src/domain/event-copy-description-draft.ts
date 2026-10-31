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
	valid(text: string): boolean {
		return text.length <= 12000;
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
				"Write one concise description for a Cloud Native Aix-Marseille meetup using only the supplied facts. Sound like an organizer inviting fellow practitioners: warm, conversational, and lively. Address the reader naturally, with short sentences and familiar words. No marketing hype, inflated promises, or filler.",
				"Open directly with the confirmed date, start/end times, host and city in a compact line. Skip the generic community introduction and impersonal announcements such as 'The event will take place'. Mention an aperitif only when aperitif=true; that fact does not establish who pays for it.",
				"For each talk, keep its original title on one line, then its public speaker(s) and one concrete teaser on the next line. Turn the abstract's actual problem or takeaway into a reason to attend, not a catalogue summary. You may echo a playful metaphor already present in the talk. Keep talk order and public speaker names. A programme heading is optional; avoid it when a single talk needs no introduction.",
				"Finish with one short, friendly invitation to join the discussion or share experience around the supplied topics. Welcome curious participants without claiming that every talk suits all skill levels; only mention a required level or specific learning outcome when the abstracts support it. Avoid stock closings such as 'Venez nombreux !' or 'Rejoignez-nous !' on their own.",
				"Return readable multiline text with actual line breaks. Separate practical details, each talk, and the invitation with a blank line. Preserve emoji in talk titles and use any additional emoji sparingly. No HTML or code blocks. Maximum 12000 characters. This is the complete event description: publication uses the approved text unchanged. Summarize talks without repeating full abstracts.",
				"This description is used on the event's registration page. Do not add a registration URL or a link placeholder. Never invent logistics, sponsors, people, or promises.",
			],
			facts: this.source(facts),
		};
	}
}
