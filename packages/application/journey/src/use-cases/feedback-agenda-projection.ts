import type { MeetupEvent } from "@meetup-automation/event";
import type { FeedbackAgenda } from "@meetup-automation/publication";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export class FeedbackAgendaProjection {
	static create(
		event: MeetupEvent,
		diagnostics: readonly PublicDiagnostic[],
	): FeedbackAgenda | undefined {
		if (
			event.agenda.length === 0 ||
			diagnostics.some(
				(item) =>
					item.severity === "error" &&
					((item.code.startsWith("referential.") &&
						!item.code.startsWith("referential.reference.host.")) ||
						item.code.startsWith("event.agenda.")),
			) ||
			event.agenda.some(
				(entry) =>
					!entry.description.trim() ||
					entry.speakers.length === 0 ||
					entry.speakers.some(
						(speaker) => !speaker.id || !speaker.displayName.trim(),
					),
			)
		)
			return undefined;
		return {
			talks: event.agenda.map((entry) => ({
				title: entry.description.trim(),
				speakers: entry.speakers.map((speaker) => ({
					id: speaker.id as string,
					name: speaker.displayName.trim(),
				})),
			})),
		};
	}
}
