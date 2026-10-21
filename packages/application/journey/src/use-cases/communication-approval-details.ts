import type { MailMessageIntent } from "@meetup-automation/communication";
import type { MeetupEvent } from "@meetup-automation/event";
import type {
	ApprovalEmailLink,
	OrganizerApprovalDetails,
} from "../ports/organizer-approval-details.js";

/** Project only public event facts and the links used by each email template. */
export class CommunicationApprovalDetails {
	create(
		event: MeetupEvent,
		mails: readonly MailMessageIntent[],
	): OrganizerApprovalDetails {
		const ordered = [...mails].sort((left, right) =>
			left.idempotencyKey.localeCompare(right.idempotencyKey),
		);
		const emails = ordered.map((mail) => {
			const links = this.links(mail);
			const name =
				mail.recipient.role === "hosting"
					? event.host?.displayName
					: event.agenda
							.flatMap((talk) => talk.speakers)
							.find((speaker) => speaker.id === mail.recipientId)?.displayName;
			return {
				kind: mail.kind,
				recipientName: name ?? "",
				links,
				omittedLinks: 0,
			};
		});
		return { emails, omittedEmails: 0 };
	}

	private links(mail: MailMessageIntent): ApprovalEmailLink[] {
		if (mail.kind === "speaker-thanks") {
			const talks = mail.placeholders.speakerFeedbackTalks;
			if (!talks || typeof talks === "string") return [];
			return talks.map(({ title, url }) => ({
				kind: "feedback",
				title,
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
}
