import type { GatewayDispatchResult } from "@meetup-automation/communication";

export interface ApprovalNotificationMessage {
	readonly destination: string;
	readonly messageId: string;
}

export type ApprovalNotificationResult = GatewayDispatchResult & {
	readonly message?: ApprovalNotificationMessage;
};

/** Public approval facts; the notification adapter owns channel-specific wording. */
export type ApprovalNotificationFacts = {
	readonly eventDate: string;
} & (
	| { readonly kind: "email-introduction"; readonly recipientCount: number }
	| { readonly kind: "meetup-publication" }
	| { readonly kind: "community-publication" }
	| { readonly kind: "content-review"; readonly target: string }
	| { readonly kind: "social-publication"; readonly target: string }
);

export type ApprovalNotificationRequest = ApprovalNotificationFacts & {
	readonly destination: string;
	readonly approvalUrl: string;
};

export interface OrganizerApprovalNotification {
	send(input: ApprovalNotificationRequest): Promise<ApprovalNotificationResult>;
	/** Repeating the same decision reaction must be safe after ambiguous responses. */
	react(
		message: ApprovalNotificationMessage,
		decision: "approved" | "rejected" | "iteration-requested",
	): Promise<boolean>;
}
