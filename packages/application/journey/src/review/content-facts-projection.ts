import type { MeetupEvent } from "@meetup-automation/event";
import type { ContentMedia } from "@meetup-automation/publication";
import type { ContentFacts } from "../proposals/promotional-content.js";
import type { ScheduledEventSettings } from "../use-cases/scheduled-event-projection.js";

export interface ContentSettings {
	readonly months: Readonly<Record<string, string>>;
	readonly mentions: readonly string[];
	readonly reminderTime: string;
	readonly guidance: string;
}
export class ContentFactsProjection {
	create(
		event: MeetupEvent,
		publication: ScheduledEventSettings,
		settings: ContentSettings,
		announcement: ContentMedia | null,
	): ContentFacts {
		return {
			date: event.date,
			startTime: publication.startTime,
			endTime: publication.endTime,
			timeZone: event.timeZone,
			month: settings.months[event.date.slice(0, 7)] ?? "",
			host: event.host?.id
				? (publication.venues[event.host.id] ?? { name: "", city: "" })
				: { name: "", city: "" },
			talks: event.agenda.map((talk, index) => ({
				id: talk.proposal?.id ?? `agenda-${index}`,
				title: talk.proposal?.title ?? talk.description,
				abstract: talk.proposal?.abstract ?? "",
				speakers: talk.speakers.map((speaker) => ({
					id: speaker.id ?? "",
					name: speaker.displayName,
				})),
			})),
			registrationUrl: event.publicationLinks.meetup ?? "",
			aperitif: event.logistics.aperitif === "planned",
			mentions: settings.mentions,
			announcement,
		};
	}
	active(event: MeetupEvent): boolean {
		return (
			event.issueState === "open" &&
			!["cancelled", "postponed", "held"].includes(
				event.occurrenceStatus ?? "",
			) &&
			event.proposalStatus !== "stale"
		);
	}
	destination(event: MeetupEvent, target: string): string | null {
		if (target === "title") return event.eventTitle;
		if (target === "description") return event.description;
		return null;
	}
}
