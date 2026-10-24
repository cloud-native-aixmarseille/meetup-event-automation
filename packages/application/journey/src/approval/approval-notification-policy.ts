import type { OrganizerApprovalRequest } from "../ports/organizer-approval.js";
import type { ApprovalNotificationFacts } from "../ports/organizer-approval-notification.js";

/** Select standalone approval notifications and their public facts. */
export class ApprovalNotificationPolicy {
	notificationFor(
		request: OrganizerApprovalRequest,
	): ApprovalNotificationFacts | undefined {
		switch (request.kind) {
			case "email-thanks":
				// Follow-up attention owns the combined task and approval notification.
				return undefined;
			case "email-introduction":
				return {
					kind: request.kind,
					eventDate: request.eventDate,
					recipientCount: request.recipientCount,
				};
			case "meetup-publication":
			case "community-publication":
				return { kind: request.kind, eventDate: request.eventDate };
			case "content-review":
				return {
					kind: request.kind,
					eventDate: request.eventDate,
					target: request.content.target,
				};
		}
	}
}
