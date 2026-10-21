import type { OrganizerApprovalRequest } from "@meetup-automation/journey";
import { ApprovalSchema } from "./approval-schema.js";
import { EmailApprovalDetailsSchema } from "./email-approval-details-schema.js";
import { MeetupApprovalDetailsSchema } from "./meetup-approval-details-schema.js";

/** Narrow the request part of external metadata without trusting asserted types. */
export class ApprovalRequestSchema {
	static validate(value: unknown): asserts value is OrganizerApprovalRequest {
		if (
			!ApprovalSchema.object(value) ||
			typeof value.revision !== "string" ||
			typeof value.eventDate !== "string" ||
			typeof value.requestedAt !== "string"
		)
			throw new Error("Invalid approval request");
		if (value.kind === "meetup-publication") {
			if (value.recipientCount !== undefined || value.details !== undefined)
				throw new Error("Invalid publication approval fields");
			MeetupApprovalDetailsSchema.validate(value.publication);
			return;
		}
		if (
			(value.kind !== "email-introduction" && value.kind !== "email-thanks") ||
			value.publication !== undefined ||
			!ApprovalSchema.count(value.recipientCount)
		)
			throw new Error("Invalid approval request");
		EmailApprovalDetailsSchema.validate(value.details);
	}
}
