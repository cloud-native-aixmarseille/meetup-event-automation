import type { MailCommunicationKind } from "@meetup-automation/communication";

export interface ApprovalEmailLink {
	readonly kind: "meetup" | "community" | "slides" | "feedback";
	readonly url: string;
	readonly title?: string;
}

export interface ApprovalEmailDetail {
	readonly kind: MailCommunicationKind;
	/** Public event participant name, never a private contact name or email address. */
	readonly recipientName: string;
	readonly links: readonly ApprovalEmailLink[];
	readonly omittedLinks: number;
}

export interface OrganizerApprovalDetails {
	readonly emails: readonly ApprovalEmailDetail[];
	readonly omittedEmails: number;
}
