export type OrganizerApprovalKind =
	| "email-introduction"
	| "email-thanks"
	| "meetup-publication";

export interface MeetupPublicationApprovalDetails {
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
	  }
	| {
			readonly kind: "meetup-publication";
			readonly publication: MeetupPublicationApprovalDetails;
			readonly recipientCount?: never;
			readonly details?: never;
	  }
);
export interface OrganizerApprovalResult {
	readonly status: "pending" | "approved" | "rejected";
	readonly notificationFailed: boolean;
}
export interface OrganizerApproval {
	request(input: OrganizerApprovalRequest): Promise<OrganizerApprovalResult>;
	synchronize(): Promise<{ readonly notificationFailed: boolean }>;
}

import type { OrganizerApprovalDetails } from "./organizer-approval-details.js";
