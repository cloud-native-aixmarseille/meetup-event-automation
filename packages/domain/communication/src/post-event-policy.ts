import type { CommunicationCalendar } from "./communication-calendar.js";
import type { EventOccurrenceStatus } from "./model.js";

export interface PostEventContext {
	readonly eventDate: string;
	readonly timeZone: string;
	readonly occurrenceStatus: EventOccurrenceStatus;
	readonly now: Date;
}

/** Follow-up eligibility does not assert that the event actually occurred. */
export interface PostEventPolicyCollaborators {
	readonly communicationCalendar: Pick<
		CommunicationCalendar,
		"isValidInstant" | "parseIsoLocalDate" | "getLocalDate" | "toEpochDay"
	>;
}

export class PostEventPolicy {
	constructor(private readonly collaborators: PostEventPolicyCollaborators) {}

	isDue(input: PostEventContext): boolean {
		if (!["scheduled", "held"].includes(input.occurrenceStatus)) return false;
		if (!this.collaborators.communicationCalendar.isValidInstant(input.now))
			return false;
		const event = this.collaborators.communicationCalendar.parseIsoLocalDate(
			input.eventDate,
		);
		const today = this.collaborators.communicationCalendar.getLocalDate(
			input.now,
			input.timeZone,
		);
		if (!event || !today) return false;
		return (
			input.occurrenceStatus === "held" ||
			this.collaborators.communicationCalendar.toEpochDay(today) >
				this.collaborators.communicationCalendar.toEpochDay(event)
		);
	}
}
