import type { GatewayDispatchResult } from "@meetup-automation/communication";

export interface ApprovalNotificationMessage {
	readonly destination: string;
	readonly messageId: string;
}

export type ApprovalNotificationResult = GatewayDispatchResult & {
	readonly message?: ApprovalNotificationMessage;
};

export interface OrganizerApprovalNotification {
	send(input: {
		readonly destination: string;
		readonly content: string;
	}): Promise<ApprovalNotificationResult>;
	/** Repeating the same decision reaction must be safe after ambiguous responses. */
	react(
		message: ApprovalNotificationMessage,
		decision: "approved" | "rejected",
	): Promise<boolean>;
}
