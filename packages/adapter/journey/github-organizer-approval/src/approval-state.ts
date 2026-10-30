import type {
	ApprovalNotificationMessage,
	OrganizerApprovalKind,
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "@meetup-automation/journey";
import type { StoredFollowUp } from "./follow-up-schema.js";
import type { ApprovalComment } from "./github-approval-contracts.js";

export type StoredApproval<
	Kind extends OrganizerApprovalKind = OrganizerApprovalKind,
> = {
	readonly [Key in Kind]: OrganizerApprovalRequest & {
		readonly kind: Key;
	} & StoredApprovalMetadata;
}[Kind];

interface StoredApprovalMetadata {
	readonly requestId: string;
	notification: "new" | "reserved" | "sent" | "retry";
	notificationMessage?: ApprovalNotificationMessage;
	decision?: FinalApprovalDecision;
	reactionSent?: boolean;
	followUp?: StoredFollowUp;
}

interface FinalApprovalDecision {
	readonly status: "approved" | "rejected" | "iteration-requested";
	readonly actor: string;
	readonly decidedAt: string;
	readonly selectedImage?: string;
	readonly editedText?: string;
}

export interface ApprovalDecision {
	readonly status: OrganizerApprovalResult["status"];
	readonly actor?: string;
	readonly decidedAt?: string;
	readonly selectedImage?: string;
	readonly editedText?: string;
}

export interface ApprovalState {
	comment: ApprovalComment;
	readonly record: StoredApproval;
}
