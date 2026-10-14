import { randomUUID } from "node:crypto";
import type {
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "@meetup-automation/journey";

export const APPROVAL_MARKER = "<!-- meetup-organizer-approval:v1 ";
export interface StoredApproval extends OrganizerApprovalRequest {
	readonly requestId: string;
	notification: "new" | "reserved" | "sent" | "retry";
}
export interface ApprovalDecision {
	readonly status: OrganizerApprovalResult["status"];
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
			record.recipientCount === input.recipientCount
		);
	}
	static validate(input: OrganizerApprovalRequest): void {
		if (
			!/^[a-f0-9]{64}$/.test(input.revision) ||
			!["email-introduction", "email-thanks"].includes(input.kind) ||
			!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) ||
			!Number.isSafeInteger(input.recipientCount) ||
			input.recipientCount <= 0 ||
			!Number.isFinite(Date.parse(input.requestedAt))
		)
			throw new Error("Invalid approval request");
	}
	static create(input: OrganizerApprovalRequest): StoredApproval {
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
		return record;
	}
	static marker(record: StoredApproval): string {
		return `${APPROVAL_MARKER}${JSON.stringify(record)} -->`;
	}
}
