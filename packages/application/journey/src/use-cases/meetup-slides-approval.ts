import type { EventClock } from "@meetup-automation/event";
import type { ApprovalValueFingerprint } from "../approval/approval-value-fingerprint.js";
import type {
	OrganizerApproval,
	OrganizerApprovalRequest,
} from "../ports/organizer-approval.js";

/** Bind attendee delivery approval to the event, PDF and message language. */
export class MeetupSlidesApproval {
	constructor(
		private readonly approvals: OrganizerApproval,
		private readonly fingerprints: Pick<ApprovalValueFingerprint, "digest">,
		private readonly clock: EventClock,
		private readonly language: string,
	) {}
	async request(eventDate: string, eventUrl: string, pdfUrl: string) {
		const slides = { eventUrl, pdfUrl, language: this.language };
		const request: OrganizerApprovalRequest = {
			kind: "meetup-slides",
			eventDate,
			slides,
			revision: this.fingerprints.digest({ eventDate, ...slides }),
			requestedAt: this.clock.now(),
		};
		return this.approvals.request(request);
	}
}
