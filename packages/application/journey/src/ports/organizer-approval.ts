export type OrganizerApprovalKind = "email-introduction" | "email-thanks";
/** Only safe public facts and an opaque digest cross this boundary. */
export interface OrganizerApprovalRequest {
	readonly kind: OrganizerApprovalKind;
	readonly revision: string;
	readonly eventDate: string;
	readonly recipientCount: number;
	readonly requestedAt: string;
}
export interface OrganizerApprovalResult {
	readonly status: "pending" | "approved" | "rejected";
	readonly notificationFailed: boolean;
}
export interface OrganizerApproval {
	request(input: OrganizerApprovalRequest): Promise<OrganizerApprovalResult>;
	synchronize(): Promise<{ readonly notificationFailed: boolean }>;
}
