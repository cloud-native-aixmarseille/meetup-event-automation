import { ApprovalRequestPolicy } from "@meetup-automation/journey";
import { ApprovalRequestSchema } from "./approval-request-schema.js";
import { ApprovalSchema } from "./approval-schema.js";
import type { StoredApproval } from "./approval-state.js";
import { FollowUpSchema } from "./follow-up-schema.js";

/** Validate versioned persistence fields and their contradictory combinations. */
export class StoredApprovalSchema {
	static validate(value: unknown): asserts value is StoredApproval {
		if (!ApprovalSchema.object(value))
			throw new Error("Invalid approval state");
		const state = value;
		ApprovalRequestSchema.validate(value);
		FollowUpSchema.validate(state.followUp);
		if (state.followUp && value.kind !== "email-thanks")
			throw new Error("Invalid post-event approval kind");
		if (value.recipientCount === 0 && state.followUp) {
			ApprovalRequestPolicy.validateIdentity(value);
			ApprovalRequestPolicy.validateEmailCount(value);
		} else {
			ApprovalRequestPolicy.validate(value);
		}
		if (
			typeof state.requestId !== "string" ||
			!/^approval-[a-f0-9-]{36}$/.test(state.requestId) ||
			!["new", "reserved", "sent", "retry"].some(
				(status) => status === state.notification,
			)
		)
			throw new Error("Invalid approval state");
		if (state.decision !== undefined) {
			StoredApprovalSchema.decision(state.decision);
			if (value.recipientCount === 0)
				throw new Error("Invalid final approval decision");
		}
		if (state.notificationMessage !== undefined)
			StoredApprovalSchema.notificationMessage(state.notificationMessage);
		if (
			state.reactionSent !== undefined &&
			(typeof state.reactionSent !== "boolean" ||
				!state.decision ||
				!state.notificationMessage)
		)
			throw new Error("Invalid approval reaction state");
	}

	private static decision(value: unknown): void {
		if (
			!ApprovalSchema.object(value) ||
			(value.status !== "approved" && value.status !== "rejected") ||
			typeof value.actor !== "string" ||
			!/^[A-Za-z0-9-]{1,39}$/.test(value.actor) ||
			typeof value.decidedAt !== "string" ||
			!Number.isFinite(Date.parse(value.decidedAt))
		)
			throw new Error("Invalid final approval decision");
	}

	private static notificationMessage(value: unknown): void {
		if (
			!ApprovalSchema.object(value) ||
			typeof value.destination !== "string" ||
			!value.destination.trim() ||
			typeof value.messageId !== "string" ||
			!value.messageId.trim()
		)
			throw new Error("Invalid approval notification reference");
	}
}
