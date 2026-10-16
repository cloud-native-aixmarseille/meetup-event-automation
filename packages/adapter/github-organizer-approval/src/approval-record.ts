import { randomUUID } from "node:crypto";
import { ApprovalDetails } from "./approval-details.js";
import { FollowUpRecord, type StoredFollowUp } from "./follow-up-record.js";
import type {
	ApprovalNotificationMessage,
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "@meetup-automation/journey";

export const APPROVAL_MARKER = "<!-- meetup-organizer-approval:v1 ";
export interface StoredApproval extends OrganizerApprovalRequest {
	readonly requestId: string;
	notification: "new" | "reserved" | "sent" | "retry";
	notificationMessage?: ApprovalNotificationMessage;
	decision?: FinalApprovalDecision;
	reactionSent?: boolean;
	followUp?: StoredFollowUp;
}
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
export class ApprovalRecord {
	static matches(
		record: StoredApproval,
		input: OrganizerApprovalRequest,
	): boolean {
		return (
			record.kind === input.kind &&
			record.revision === input.revision &&
			record.eventDate === input.eventDate &&
			record.recipientCount === input.recipientCount &&
			(Boolean(record.decision) ||
				JSON.stringify(record.details) === JSON.stringify(input.details))
		);
	}
	static validate(
		input: OrganizerApprovalRequest & { followUp?: StoredFollowUp },
	): void {
		FollowUpRecord.validate(input.followUp);
		if (input.followUp && input.kind !== "email-thanks")
			throw new Error("Invalid post-event approval kind");
		if (
			!/^[a-f0-9]{64}$/.test(input.revision) ||
			!["email-introduction", "email-thanks"].includes(input.kind) ||
			!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) ||
			!Number.isSafeInteger(input.recipientCount) ||
			(input.recipientCount <= 0 &&
				!(
					input.recipientCount === 0 &&
					input.kind === "email-thanks" &&
					input.followUp
				)) ||
			!Number.isFinite(Date.parse(input.requestedAt))
		)
			throw new Error("Invalid approval request");
		ApprovalDetails.validate(input.details, input.recipientCount);
	}
	static create(
		input: OrganizerApprovalRequest & { followUp?: StoredFollowUp },
	): StoredApproval {
		ApprovalRecord.validate(input);
		return {
			...input,
			requestId: `approval-${randomUUID()}`,
			notification: "new",
		};
	}
	static read(body: string): StoredApproval {
		const line = body.split("\n", 1)[0];
		if (!line?.startsWith(APPROVAL_MARKER) || !line.endsWith(" -->"))
			throw new Error("Invalid approval record");
		const record = JSON.parse(
			line.slice(APPROVAL_MARKER.length, -4),
		) as StoredApproval;
		ApprovalRecord.validate(record);
		if (
			!/^approval-[a-f0-9-]{36}$/.test(record.requestId) ||
			!["new", "reserved", "sent", "retry"].includes(record.notification)
		)
			throw new Error("Invalid approval state");
		if (
			record.decision &&
			(record.recipientCount === 0 ||
				!["approved", "rejected"].includes(record.decision.status) ||
				!/^[A-Za-z0-9-]{1,39}$/.test(record.decision.actor) ||
				!Number.isFinite(Date.parse(record.decision.decidedAt)))
		)
			throw new Error("Invalid final approval decision");
		if (
			record.notificationMessage &&
			(typeof record.notificationMessage.destination !== "string" ||
				!record.notificationMessage.destination.trim() ||
				typeof record.notificationMessage.messageId !== "string" ||
				!record.notificationMessage.messageId.trim())
		)
			throw new Error("Invalid approval notification reference");
		if (
			record.reactionSent !== undefined &&
			(typeof record.reactionSent !== "boolean" ||
				!record.decision ||
				!record.notificationMessage)
		)
			throw new Error("Invalid approval reaction state");
		return record;
	}
	static marker(record: StoredApproval): string {
		const json = JSON.stringify(record)
			.replaceAll("<", "\\u003c")
			.replaceAll(">", "\\u003e")
			.replaceAll("&", "\\u0026");
		return `${APPROVAL_MARKER}${json} -->`;
	}
}
