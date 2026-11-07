export interface ApprovalNotificationMessage {
	readonly destination: string;
	readonly messageId: string;
}

export interface OrganizerApprovalNotification {
	/** Repeating the same decision reaction must be safe after ambiguous responses. */
	react(
		message: ApprovalNotificationMessage,
		decision: "approved" | "rejected" | "iteration-requested",
	): Promise<boolean>;
}
