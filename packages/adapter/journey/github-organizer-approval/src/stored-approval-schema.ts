import type { ApprovalRequestPolicy } from "@meetup-automation/journey";
import type { ApprovalRequestSchema } from "./approval-request-schema.js";
import type { ApprovalSchema } from "./approval-schema.js";
import type { StoredApproval } from "./approval-state.js";
import type { FollowUpSchema } from "./follow-up-schema.js";

/** Validate versioned persistence fields and their contradictory combinations. */
export interface StoredApprovalSchemaCollaborators {
	readonly approvalSchema: Pick<ApprovalSchema, "object">;
	readonly approvalRequestSchema: Pick<ApprovalRequestSchema, "validate">;
	readonly followUpSchema: Pick<FollowUpSchema, "validate">;
	readonly approvalRequestPolicy: Pick<
		ApprovalRequestPolicy,
		"validateSnapshot"
	>;
}

export class StoredApprovalSchema {
	constructor(
		private readonly collaborators: StoredApprovalSchemaCollaborators,
	) {}

	validate(value: unknown): asserts value is StoredApproval {
		if (!this.collaborators.approvalSchema.object(value))
			throw new Error("Invalid approval state");
		const state = value;
		this.collaborators.approvalRequestSchema.validate(value);
		this.collaborators.followUpSchema.validate(state.followUp);
		this.collaborators.approvalRequestPolicy.validateSnapshot(value, {
			hasFollowUp: state.followUp !== undefined,
			decided: state.decision !== undefined,
		});

		if (
			typeof state.requestId !== "string" ||
			!/^approval-[a-f0-9-]{36}$/.test(state.requestId) ||
			!["new", "reserved", "sent", "retry"].some(
				(status) => status === state.notification,
			)
		)
			throw new Error("Invalid approval state");
		if (state.decision !== undefined) {
			this.decision(state.decision);
		}
		if (state.notificationMessage !== undefined)
			this.notificationMessage(state.notificationMessage);
		if (
			state.reactionSent !== undefined &&
			(typeof state.reactionSent !== "boolean" ||
				!state.decision ||
				!state.notificationMessage)
		)
			throw new Error("Invalid approval reaction state");
	}

	private decision(value: unknown): void {
		if (
			!this.collaborators.approvalSchema.object(value) ||
			(value.status !== "approved" && value.status !== "rejected") ||
			typeof value.actor !== "string" ||
			!/^[A-Za-z0-9-]{1,39}$/.test(value.actor) ||
			typeof value.decidedAt !== "string" ||
			!Number.isFinite(Date.parse(value.decidedAt))
		)
			throw new Error("Invalid final approval decision");
	}

	private notificationMessage(value: unknown): void {
		if (
			!this.collaborators.approvalSchema.object(value) ||
			typeof value.destination !== "string" ||
			!value.destination.trim() ||
			typeof value.messageId !== "string" ||
			!value.messageId.trim()
		)
			throw new Error("Invalid approval notification reference");
	}
}
