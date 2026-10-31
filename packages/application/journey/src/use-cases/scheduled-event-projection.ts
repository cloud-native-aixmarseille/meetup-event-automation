import type { MeetupEvent } from "@meetup-automation/event";
import type { ScheduledEvent } from "@meetup-automation/publication";

export type ScheduledEventSettings = Readonly<{
	startTime: string;
	endTime: string;
	venues: Readonly<Record<string, Readonly<{ name: string; city: string }>>>;
}>;

export class ScheduledEventProjection {
	create(
		event: MeetupEvent,
		settings: ScheduledEventSettings,
	): ScheduledEvent | undefined {
		const venue = event.host?.id ? settings.venues[event.host.id] : undefined;
		if (
			!venue ||
			!event.description.trim() ||
			!event.confirmations.speakers ||
			event.proposalStatus === "stale" ||
			!event.agenda.length ||
			event.agenda.some(
				(talk) =>
					!talk.description.trim() ||
					!talk.speakers.length ||
					talk.speakers.some((speaker) => !speaker.id),
			)
		)
			return undefined;
		return {
			title: event.eventTitle.trim(),
			description: event.description,
			date: event.date,
			startTime: settings.startTime,
			endTime: settings.endTime,
			timeZone: event.timeZone,
			venue,
		};
	}
}
