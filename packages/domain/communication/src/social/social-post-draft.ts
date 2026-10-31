export type SocialPostChannel = "slack" | "linkedin";
export type SocialPostMilestone = "announcement" | "d7" | "d0";
export interface SocialPostFacts {
	readonly date: string;
	readonly startTime: string;
	readonly endTime: string;
	readonly timeZone: string;
	readonly host: Readonly<{ name: string; city: string }>;
	readonly talks: readonly Readonly<{
		id: string;
		title: string;
		abstract: string;
		speakers: readonly Readonly<{ id: string; name: string }>[];
	}>[];
	readonly registrationUrl: string;
	readonly aperitif: boolean;
	readonly mentions: readonly string[];
}

export class SocialPostDraft {
	ready(facts: SocialPostFacts): boolean {
		return (
			Boolean(
				facts.date &&
					facts.startTime &&
					facts.host.name &&
					facts.host.city &&
					facts.registrationUrl,
			) &&
			facts.talks.length > 0 &&
			facts.talks.every(
				(talk) =>
					Boolean(talk.title.trim()) &&
					talk.speakers.length > 0 &&
					talk.speakers.every((speaker) =>
						Boolean(speaker.id && speaker.name.trim()),
					),
			)
		);
	}
	valid(
		facts: SocialPostFacts,
		text: string,
		channel: SocialPostChannel | undefined,
	): boolean {
		return (
			text.length <= 2800 &&
			Boolean(facts.registrationUrl) &&
			text.includes(facts.registrationUrl) &&
			(channel !== "slack" ||
				(!text.includes(String.fromCharCode(0)) && !/<[!@#]/.test(text))) &&
			(channel !== "linkedin" || !/@\[[^\]]*\]\(urn:li:/.test(text))
		);
	}
	source(facts: SocialPostFacts, channel: SocialPostChannel) {
		return {
			date: facts.date,
			startTime: facts.startTime,
			endTime: facts.endTime,
			timeZone: facts.timeZone,
			host: { name: facts.host.name, city: facts.host.city },
			talks: facts.talks.map((talk) => ({
				id: talk.id,
				title: talk.title,
				abstract: talk.abstract,
				speakers: talk.speakers.map((speaker) => ({
					id: speaker.id,
					name: speaker.name,
				})),
			})),
			aperitif: facts.aperitif,
			registrationUrl: facts.registrationUrl,
			...(channel === "linkedin" ? { mentions: [...facts.mentions] } : {}),
		};
	}
	brief(
		facts: SocialPostFacts,
		channel: SocialPostChannel,
		milestone: SocialPostMilestone,
		language: "en" | "fr",
		guidance: string,
	) {
		const reminder = milestone !== "announcement";
		const opening =
			milestone === "d7" ? "Dans une semaine :" : "C'est aujourd'hui :";
		return {
			language,
			guidance,
			instructions: [
				"Write one concise Cloud Native Aix-Marseille meetup post using only the supplied facts. Sound like an organizer inviting fellow practitioners: warm, conversational, and lively, with short sentences and familiar words. Give a concrete reason to come and discuss the supplied topics. No marketing hype, inflated promises, generic welcome, or filler. Maximum 2800 characters; prefer much shorter when the programme allows it.",
				channel === "linkedin"
					? "Use Unicode emoji. End with one short relevant hashtags paragraph and a final line containing the public host name, public speaker names, and organizer names from mentions, separated by spaced hyphens. Never invent account handles or tags."
					: "Use Slack emoji aliases such as :rocket:, :date:, :round_pushpin:, :beers:, :alarm_clock:. No hashtags or mention footer.",
				`Opening: ${reminder ? opening : "Prochain Meetup"} Cloud Native Aix-Marseille ! (translate for English). Then blank line, date, start/end times, host - city, blank line, ordered talk titles and public speaker names${reminder ? ", without detailed teasers" : ", each followed by one concrete teaser about the problem or takeaway in its abstract"}. A programme heading is optional for a single talk. Preserve playful wording already present in the talk titles.`,
				"End with a short, friendly invitation to join the discussion or share experience, then Inscrivez-vous : registrationUrl (translate for English). Use the exact registrationUrl; never shorten it or substitute a placeholder. Welcome curious participants without inventing prerequisites or promising every talk suits all skill levels. The date/time must remain explicit, including reminders. No invented countdown, scarcity or urgency. Mention an aperitif only when aperitif=true; do not infer who pays for it. Keep talk order and public speaker names.",
			],
			facts: this.source(facts, channel),
		};
	}
}
