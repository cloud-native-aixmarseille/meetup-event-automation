import type { EventPublicationApprovalDetails } from "@meetup-automation/journey";
import {
	MeetupEventUrl,
	type ScheduledEventPolicy,
} from "@meetup-automation/publication";
import type { ApprovalSchema } from "./approval-schema.js";

export interface MeetupApprovalDetailsSchemaCollaborators {
	readonly approvalSchema: Pick<ApprovalSchema, "object" | "text">;
	readonly scheduledEventPolicy: Pick<ScheduledEventPolicy, "validTime">;
}

export class MeetupApprovalDetailsSchema {
	constructor(
		private readonly collaborators: MeetupApprovalDetailsSchemaCollaborators,
	) {}

	validate(value: unknown): asserts value is EventPublicationApprovalDetails {
		if (
			!this.collaborators.approvalSchema.object(value) ||
			!this.text(value.url, 2048) ||
			MeetupEventUrl.parse(value.url)?.value !== value.url ||
			!this.text(value.title, 80) ||
			typeof value.startTime !== "string" ||
			!this.collaborators.scheduledEventPolicy.validTime(value.startTime) ||
			typeof value.endTime !== "string" ||
			!this.collaborators.scheduledEventPolicy.validTime(value.endTime) ||
			!this.text(value.timeZone, 100) ||
			!this.collaborators.approvalSchema.object(value.venue) ||
			!this.text(value.venue.name, 500) ||
			!this.text(value.venue.city, 500)
		)
			throw new Error("Invalid Meetup approval details");
	}
	private text(value: unknown, maximum: number): value is string {
		return (
			this.collaborators.approvalSchema.text(value, maximum) &&
			value.trim().length > 0
		);
	}
}
