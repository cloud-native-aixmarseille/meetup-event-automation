import type { EventClock } from "@meetup-automation/event";
import {
	type EventPublicationIdentity,
	type ScheduledEvent,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type {
	OrganizerApproval,
	OrganizerApprovalResult,
} from "../ports/organizer-approval.js";
import type { EventPublicationConfiguration } from "./event-publication-contracts.js";

export class EventPublicationApproval<Event extends ScheduledEvent> {
	constructor(
		private readonly revision: EventPublicationConfiguration<
			Event,
			unknown
		>["revision"],
		private readonly approvals: OrganizerApproval,
		private readonly clock: EventClock,
		private readonly kind: EventPublicationConfiguration<
			Event,
			unknown
		>["approvalKind"],
		private readonly target: string,
	) {}
	async request(
		event: Event,
		identity: EventPublicationIdentity,
	): Promise<OrganizerApprovalResult> {
		try {
			return await this.approvals.request({
				kind: this.kind,
				revision: this.revision.of(event, identity, this.target),
				eventDate: event.date,
				requestedAt: this.clock.now(),
				publication: {
					url: identity.reviewUrl,
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
	async requireApproved(
		event: Event,
		identity: EventPublicationIdentity,
	): Promise<void> {
		const result = await this.request(event, identity);
		if (result.status !== "approved")
			throw new ScheduledEventError(
				result.status === "pending" ? "approval-pending" : "approval-rejected",
			);
	}
}
