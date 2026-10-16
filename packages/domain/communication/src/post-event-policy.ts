import { CommunicationCalendar } from "./communication-calendar.js";
import type { EventOccurrenceStatus } from "./model.js";

export interface PostEventContext {
	readonly eventDate: string;
	readonly timeZone: string;
	readonly occurrenceStatus: EventOccurrenceStatus;
	readonly now: Date;
}

/** Follow-up eligibility does not assert that the event actually occurred. */
export class PostEventPolicy {
	static isDue(input: PostEventContext): boolean {
		if (!["scheduled", "held"].includes(input.occurrenceStatus)) return false;
		if (!CommunicationCalendar.isValidInstant(input.now)) return false;
		const event = CommunicationCalendar.parseIsoLocalDate(input.eventDate);
		const today = CommunicationCalendar.getLocalDate(input.now, input.timeZone);
		if (!event || !today) return false;
		return (
			input.occurrenceStatus === "held" ||
			CommunicationCalendar.toEpochDay(today) >
				CommunicationCalendar.toEpochDay(event)
		);
	}
}
