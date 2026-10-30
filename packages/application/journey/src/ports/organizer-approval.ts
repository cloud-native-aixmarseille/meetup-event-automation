export type OrganizerApprovalKind =
	| "email-introduction"
	| "email-thanks"
	| "meetup-publication"
	| "community-publication"
	| "social-publication"
	| "content-review";

export interface SocialPublicationApprovalDetails {
	readonly intentId: string;
	readonly target: string;
	readonly destinationLabel: string;
	readonly destinationIdentity: string;
	readonly text: string;
	readonly media: readonly import("@meetup-automation/publication").ContentMedia[];
	readonly plannedAt: string;
	readonly expiresAt: string;
	readonly recovery?: Readonly<{
		outcome: "published" | "not-published";
		reference: string;
	}>;
}

export interface ContentApprovalDetails {
	readonly plannedAt?: string;
	readonly attempts?: readonly (
		| "not-started"
		| "reserved"
		| "complete"
		| "failed"
	)[];
	readonly key: string;
	readonly target: import("../proposals/promotional-content.js").ContentTarget;
	readonly language: "en" | "fr";
	readonly origin: string;
	readonly draft: import("../proposals/promotional-content.js").ContentDraft;
}

export interface EventPublicationApprovalDetails {
	readonly url: string;
	readonly title: string;
	readonly startTime: string;
	readonly endTime: string;
	readonly timeZone: string;
	readonly venue: Readonly<{ name: string; city: string }>;
}
/** Only safe public facts and an opaque digest cross this boundary. */
export type OrganizerApprovalRequest = {
	readonly revision: string;
	readonly eventDate: string;
	readonly requestedAt: string;
} & (
	| {
			readonly kind: "email-introduction" | "email-thanks";
			readonly recipientCount: number;
			readonly details?: OrganizerApprovalDetails;
			readonly publication?: never;
			readonly content?: never;
			readonly social?: never;
	  }
	| {
			readonly kind: "meetup-publication";
			readonly publication: EventPublicationApprovalDetails;
			readonly recipientCount?: never;
			readonly details?: never;
			readonly content?: never;
			readonly social?: never;
	  }
	| {
			readonly kind: "community-publication";
			readonly publication: EventPublicationApprovalDetails;
			readonly recipientCount?: never;
			readonly details?: never;
			readonly content?: never;
			readonly social?: never;
	  }
	| {
			readonly kind: "content-review";
			readonly content: ContentApprovalDetails;
			readonly publication?: never;
			readonly recipientCount?: never;
			readonly details?: never;
			readonly social?: never;
	  }
	| {
			readonly kind: "social-publication";
			readonly social: SocialPublicationApprovalDetails;
			readonly content?: never;
			readonly publication?: never;
			readonly recipientCount?: never;
			readonly details?: never;
	  }
);
export interface OrganizerApprovalResult {
	readonly status: "pending" | "approved" | "rejected" | "iteration-requested";
	readonly notificationFailed: boolean;
	readonly invalidText?: boolean;
	readonly actor?: string;
	readonly decidedAt?: string;
	readonly selectedImage?: string;
	readonly editedText?: string;
}
export interface OrganizerApproval {
	request(
		input: OrganizerApprovalRequest,
		validateText?: (text: string) => boolean,
	): Promise<OrganizerApprovalResult>;
	synchronize(): Promise<{ readonly notificationFailed: boolean }>;
}

import type { OrganizerApprovalDetails } from "./organizer-approval-details.js";
