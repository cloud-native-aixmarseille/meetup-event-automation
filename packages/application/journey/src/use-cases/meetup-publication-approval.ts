import type { EventClock } from "@meetup-automation/event";
import {
	type ScheduledEvent,
	ScheduledEventError,
} from "@meetup-automation/publication";
import { MeetupPublicationRevision } from "../approval/meetup-publication-revision.js";
import type {
	OrganizerApproval,
	OrganizerApprovalResult,
} from "../ports/organizer-approval.js";

export class MeetupPublicationApproval {
	constructor(
		private readonly approvals: OrganizerApproval,
		private readonly clock: EventClock,
	) {}
	async request(
		event: ScheduledEvent,
		url: string,
	): Promise<OrganizerApprovalResult> {
		try {
			return await this.approvals.request({
				kind: "meetup-publication",
				revision: MeetupPublicationRevision.of(event, url),
				eventDate: event.date,
				requestedAt: this.clock.now(),
				publication: {
					url,
					title: event.title,
					startTime: event.startTime,
					endTime: event.endTime,
					timeZone: event.timeZone,
					venue: event.venue,
				},
			});
		} catch {
			throw new ScheduledEventError("approval-unavailable");
		}
	}
	async requireApproved(event: ScheduledEvent, url: string): Promise<void> {
		const result = await this.request(event, url);
		if (result.status !== "approved")
			throw new ScheduledEventError(
				result.status === "pending" ? "approval-pending" : "approval-rejected",
			);
	}
}
