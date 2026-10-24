import type { EventPublicationApprovalDetails } from "@meetup-automation/journey";
import type { ScheduledEventPolicy } from "@meetup-automation/publication";
import type { ApprovalSchema } from "./approval-schema.js";

export interface CommunityApprovalDetailsSchemaCollaborators {
	readonly approvalSchema: Pick<ApprovalSchema, "object" | "text">;
	readonly scheduledEventPolicy: Pick<ScheduledEventPolicy, "validTime">;
}

export class CommunityApprovalDetailsSchema {
	constructor(
		private readonly collaborators: CommunityApprovalDetailsSchemaCollaborators,
	) {}

	validate(value: unknown): asserts value is EventPublicationApprovalDetails {
		if (
			!this.collaborators.approvalSchema.object(value) ||
			!this.text(value.url, 2048) ||
			!this.reviewUrl(value.url) ||
			!this.text(value.title, 120) ||
			typeof value.startTime !== "string" ||
			!this.collaborators.scheduledEventPolicy.validTime(value.startTime) ||
			typeof value.endTime !== "string" ||
			!this.collaborators.scheduledEventPolicy.validTime(value.endTime) ||
			!this.text(value.timeZone, 100) ||
			!this.collaborators.approvalSchema.object(value.venue) ||
			!this.text(value.venue.name, 500) ||
			!this.text(value.venue.city, 500)
		)
			throw new Error("Invalid community approval details");
	}
	private reviewUrl(value: string): boolean {
		try {
			const url = new URL(value);
			return (
				url.protocol === "https:" &&
				!url.username &&
				!url.password &&
				value === `${url.origin}${url.pathname}` &&
				/^\/dashboard\/group\/events\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/update$/.test(
					url.pathname,
				)
			);
		} catch {
			return false;
		}
	}
	private text(value: unknown, maximum: number): value is string {
		return (
			this.collaborators.approvalSchema.text(value, maximum) &&
			value.trim().length > 0
		);
	}
}
