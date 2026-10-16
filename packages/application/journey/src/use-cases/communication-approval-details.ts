import type { MailMessageIntent } from "@meetup-automation/communication";
import type { MeetupEvent } from "@meetup-automation/event";
import type {
	ApprovalEmailLink,
	OrganizerApprovalDetails,
} from "../ports/organizer-approval-details.js";

/** Project only public event facts and the links used by each email template. */
export class CommunicationApprovalDetails {
	static create(
		event: MeetupEvent,
		mails: readonly MailMessageIntent[],
	): OrganizerApprovalDetails {
		const ordered = [...mails].sort((left, right) =>
			left.idempotencyKey.localeCompare(right.idempotencyKey),
		);
		const emails = ordered.slice(0, 20).map((mail) => {
			const links = CommunicationApprovalDetails.links(mail);
			const name =
				mail.recipient.role === "hosting"
					? event.host?.displayName
					: event.agenda
							.flatMap((talk) => talk.speakers)
							.find((speaker) => speaker.id === mail.recipientId)?.displayName;
			return {
				kind: mail.kind,
				recipientName: CommunicationApprovalDetails.text(name ?? ""),
				links: links.slice(0, 8),
				omittedLinks: links.length - Math.min(links.length, 8),
			};
		});
		// Leave room for metadata, escaped HTML and the approval controls in a GitHub comment.
		while (JSON.stringify(emails).length > 4_000) {
			const largest = [...emails].sort(
				(a, b) => JSON.stringify(b).length - JSON.stringify(a).length,
			)[0];
			if (largest?.links.length) {
				largest.links.pop();
				largest.omittedLinks++;
			} else {
				emails.pop();
			}
		}
		return { emails, omittedEmails: mails.length - emails.length };
	}

	private static links(mail: MailMessageIntent): ApprovalEmailLink[] {
		if (mail.kind === "speaker-thanks") {
			const talks = mail.placeholders.speakerFeedbackTalks;
			if (!talks || typeof talks === "string") return [];
			return talks.map(({ title, url }) => ({
				kind: "feedback",
				title: CommunicationApprovalDetails.text(title),
				url,
			}));
		}
		if (mail.kind === "host-thanks") return [];
		const links: ApprovalEmailLink[] = [];
		for (const [kind, placeholder] of [
			["meetup", "eventMeetupUrl"],
			["community", "eventCncfUrl"],
			["slides", "eventSlidesUrl"],
		] as const) {
			const url = mail.placeholders[placeholder];
			if (typeof url === "string" && url) links.push({ kind, url });
		}
		return links;
	}

	private static text(value: string): string {
		const normalized = value.trim().replace(/\s+/g, " ");
		return normalized.length <= 200
			? normalized
			: `${normalized.slice(0, 197)}...`;
	}
}
