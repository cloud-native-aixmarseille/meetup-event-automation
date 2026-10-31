import type { ScheduledEvent } from "./scheduled-event-ports.js";

export interface MeetupTopicSelection {
	select(
		event: Pick<ScheduledEvent, "title" | "description">,
		candidates: readonly string[],
	): Promise<readonly string[]>;
}
