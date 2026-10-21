import type { MeetupEvent } from "@meetup-automation/event";
import type { ScheduledEvent } from "@meetup-automation/publication";

export type MeetupPublicationSettings = Readonly<{
	startTime: string;
	endTime: string;
	venues: Readonly<Record<string, Readonly<{ name: string; city: string }>>>;
}>;

export class MeetupPublicationProjection {
	create(
		event: MeetupEvent,
		settings: MeetupPublicationSettings,
	): ScheduledEvent | undefined {
		const venue = event.host?.id ? settings.venues[event.host.id] : undefined;
		if (
			!venue ||
			!event.description.trim() ||
			!event.confirmations.host ||
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
		const talks = event.agenda.map((talk) =>
			[
				talk.description,
				talk.speakers.map((speaker) => speaker.displayName).join(", "),
				talk.proposal?.abstract,
			]
				.filter(Boolean)
				.join("\n"),
		);
		return {
			title: event.eventTitle.trim(),
			description: [event.description.trim(), ...talks].join("\n\n"),
			date: event.date,
			startTime: settings.startTime,
			endTime: settings.endTime,
			timeZone: event.timeZone,
			venue,
		};
	}
}
