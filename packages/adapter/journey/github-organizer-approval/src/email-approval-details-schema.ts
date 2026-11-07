import type {
	ApprovalEmailDetail,
	ApprovalEmailLink,
	OrganizerApprovalDetails,
} from "@meetup-automation/journey";
import type { ApprovalSchema } from "./approval-schema.js";

export interface EmailApprovalDetailsSchemaCollaborators {
	readonly approvalSchema: Pick<ApprovalSchema, "object" | "count" | "text">;
	readonly parameterPolicy: import("@meetup-automation/journey").EmailReviewParameterPolicy;
}

export class EmailApprovalDetailsSchema {
	constructor(
		private readonly collaborators: EmailApprovalDetailsSchemaCollaborators,
	) {}

	validate(
		details: unknown,
	): asserts details is OrganizerApprovalDetails | undefined {
		if (details === undefined) return;
		if (
			!this.collaborators.approvalSchema.object(details) ||
			!Array.isArray(details.emails) ||
			details.emails.length > 20 ||
			!this.collaborators.approvalSchema.count(details.omittedEmails) ||
			JSON.stringify(details).length > 12_000 ||
			!details.emails.every(this.email.bind(this))
		)
			throw new Error("Invalid approval details");
		if (
			details.mailKind !== undefined &&
			(![
				"host-introduction",
				"speaker-introduction",
				"host-thanks",
				"speaker-thanks",
			].includes(String(details.mailKind)) ||
				!details.emails.every((email) => email.kind === details.mailKind))
		)
			throw new Error("Invalid email approval scope");
		if (details.parameters !== undefined)
			this.collaborators.parameterPolicy.validate(details.parameters);
	}

	private email(email: unknown): email is ApprovalEmailDetail {
		return (
			this.collaborators.approvalSchema.object(email) &&
			typeof email.kind === "string" &&
			[
				"host-introduction",
				"speaker-introduction",
				"host-thanks",
				"speaker-thanks",
			].includes(email.kind) &&
			this.collaborators.approvalSchema.text(email.recipientName, 200) &&
			this.collaborators.approvalSchema.count(email.omittedLinks) &&
			Array.isArray(email.links) &&
			email.links.length <= 8 &&
			email.links.every(this.link.bind(this))
		);
	}

	private link(link: unknown): link is ApprovalEmailLink {
		return (
			this.collaborators.approvalSchema.object(link) &&
			typeof link.kind === "string" &&
			["meetup", "community", "slides", "feedback"].includes(link.kind) &&
			(link.title === undefined ||
				this.collaborators.approvalSchema.text(link.title, 200)) &&
			this.url(link.url)
		);
	}

	private url(value: unknown): boolean {
		if (
			typeof value !== "string" ||
			value.length > 2048 ||
			/\s/.test(value) ||
			value.includes("\0")
		)
			return false;
		try {
			const url = new URL(value);
			return url.protocol === "https:" && !url.username && !url.password;
		} catch {
			return false;
		}
	}
}
