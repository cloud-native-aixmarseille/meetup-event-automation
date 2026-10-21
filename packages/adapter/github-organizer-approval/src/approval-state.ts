import type {
	ApprovalNotificationMessage,
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "@meetup-automation/journey";
import type { StoredFollowUp } from "./follow-up-schema.js";
import type { ApprovalComment } from "./github-approval-contracts.js";

export type StoredApproval = OrganizerApprovalRequest & {
	readonly requestId: string;
	notification: "new" | "reserved" | "sent" | "retry";
	notificationMessage?: ApprovalNotificationMessage;
	decision?: FinalApprovalDecision;
	reactionSent?: boolean;
	followUp?: StoredFollowUp;
};

interface FinalApprovalDecision {
	readonly status: "approved" | "rejected";
	readonly actor: string;
	readonly decidedAt: string;
}

export interface ApprovalDecision {
	readonly status: OrganizerApprovalResult["status"];
	readonly actor?: string;
	readonly decidedAt?: string;
}

export interface ApprovalState {
	comment: ApprovalComment;
	readonly record: StoredApproval;
}
