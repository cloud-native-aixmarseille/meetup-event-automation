import type {
	MailCommunicationKind,
	MailMessageIntent,
} from "@meetup-automation/communication";

export interface ApprovalEmailLink {
	readonly kind: "meetup" | "community" | "slides" | "feedback";
	readonly url: string;
	readonly title?: string;
}

export interface ApprovalEmailDetail {
	readonly kind: MailCommunicationKind;
	/** Public participant label, separate from the exact delivery destination. */
	readonly recipientName: string;
	/** Absent only from previously stored summaries. New reviews include every value. */
	readonly message?: {
		readonly recipientEmail: string;
		readonly templateName: MailMessageIntent["templateName"];
		readonly idempotencyKey: string;
		readonly placeholders: MailMessageIntent["placeholders"];
		/** Shared editable values that are not overridden by this recipient. */
		readonly parameterKeys: readonly string[];
	};
	readonly links: readonly ApprovalEmailLink[];
	readonly omittedLinks: number;
}

export interface OrganizerApprovalDetails {
	readonly mailKind?: MailCommunicationKind;
	readonly parameters?: import("../approval/email-review-parameters.js").EmailReviewParameters;
	readonly emails: readonly ApprovalEmailDetail[];
	readonly omittedEmails: number;
}
