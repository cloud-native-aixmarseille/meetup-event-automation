import type { OrganizerApprovalRequest } from "@meetup-automation/journey";
import type { ApprovalSchema } from "./approval-schema.js";
import type { CommunityApprovalDetailsSchema } from "./community-approval-details-schema.js";
import type { ContentApprovalSchema } from "./content-approval-schema.js";
import type { EmailApprovalDetailsSchema } from "./email-approval-details-schema.js";
import type { MeetupApprovalDetailsSchema } from "./meetup-approval-details-schema.js";
import type { SocialPublicationApprovalSchema } from "./social-publication-approval-schema.js";

/** Narrow the request part of external metadata without trusting asserted types. */
export interface ApprovalRequestSchemaCollaborators {
	readonly socialPublicationApprovalSchema: Pick<
		SocialPublicationApprovalSchema,
		"validate"
	>;
	readonly communityApprovalDetailsSchema: Pick<
		CommunityApprovalDetailsSchema,
		"validate"
	>;
	readonly approvalSchema: Pick<ApprovalSchema, "object" | "count">;
	readonly contentApprovalSchema: Pick<ContentApprovalSchema, "validate">;
	readonly meetupApprovalDetailsSchema: Pick<
		MeetupApprovalDetailsSchema,
		"validate"
	>;
	readonly emailApprovalDetailsSchema: Pick<
		EmailApprovalDetailsSchema,
		"validate"
	>;
}

export class ApprovalRequestSchema {
	constructor(
		private readonly collaborators: ApprovalRequestSchemaCollaborators,
	) {}

	validate(value: unknown): asserts value is OrganizerApprovalRequest {
		if (
			!this.collaborators.approvalSchema.object(value) ||
			typeof value.revision !== "string" ||
			typeof value.eventDate !== "string" ||
			typeof value.requestedAt !== "string"
		)
			throw new Error("Invalid approval request");
		if (value.kind === "social-publication") {
			this.social(value);
			return;
		}
		if (value.social !== undefined)
			throw new Error("Invalid social publication approval kind");
		if (value.kind === "content-review") {
			if (
				value.publication !== undefined ||
				value.recipientCount !== undefined ||
				value.details !== undefined
			)
				throw new Error("Invalid content approval fields");
			this.collaborators.contentApprovalSchema.validate(value.content);
			return;
		}
		if (value.content !== undefined)
			throw new Error("Invalid content approval kind");
		if (
			value.kind === "community-publication" ||
			value.kind === "meetup-publication"
		) {
			this.publication(value);
			return;
		}
		if (
			(value.kind !== "email-introduction" && value.kind !== "email-thanks") ||
			value.publication !== undefined ||
			!this.collaborators.approvalSchema.count(value.recipientCount)
		)
			throw new Error("Invalid approval request");
		this.collaborators.emailApprovalDetailsSchema.validate(value.details);
	}
	private social(value: Record<string, unknown>): void {
		if (
			value.content !== undefined ||
			value.publication !== undefined ||
			value.recipientCount !== undefined ||
			value.details !== undefined
		)
			throw new Error("Invalid social publication approval fields");
		this.collaborators.socialPublicationApprovalSchema.validate(value.social);
	}
	private publication(value: Record<string, unknown>): void {
		if (value.recipientCount !== undefined || value.details !== undefined)
			throw new Error("Invalid publication approval fields");
		if (value.kind === "community-publication")
			this.collaborators.communityApprovalDetailsSchema.validate(
				value.publication,
			);
		else
			this.collaborators.meetupApprovalDetailsSchema.validate(
				value.publication,
			);
	}
}
