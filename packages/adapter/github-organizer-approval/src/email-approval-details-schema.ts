import type {
	ApprovalEmailDetail,
	ApprovalEmailLink,
	OrganizerApprovalDetails,
} from "@meetup-automation/journey";
import { ApprovalSchema } from "./approval-schema.js";

export class EmailApprovalDetailsSchema {
	static validate(
		details: unknown,
	): asserts details is OrganizerApprovalDetails | undefined {
		if (details === undefined) return;
		if (
			!ApprovalSchema.object(details) ||
			!Array.isArray(details.emails) ||
			details.emails.length > 20 ||
			!ApprovalSchema.count(details.omittedEmails) ||
			JSON.stringify(details).length > 12_000 ||
			!details.emails.every(EmailApprovalDetailsSchema.email)
		)
			throw new Error("Invalid approval details");
	}

	private static email(email: unknown): email is ApprovalEmailDetail {
		return (
			ApprovalSchema.object(email) &&
			typeof email.kind === "string" &&
			[
				"host-introduction",
				"speaker-introduction",
				"host-thanks",
				"speaker-thanks",
			].includes(email.kind) &&
			ApprovalSchema.text(email.recipientName, 200) &&
			ApprovalSchema.count(email.omittedLinks) &&
			Array.isArray(email.links) &&
			email.links.length <= 8 &&
			email.links.every(EmailApprovalDetailsSchema.link)
		);
	}

	private static link(link: unknown): link is ApprovalEmailLink {
		return (
			ApprovalSchema.object(link) &&
			typeof link.kind === "string" &&
			["meetup", "community", "slides", "feedback"].includes(link.kind) &&
			(link.title === undefined || ApprovalSchema.text(link.title, 200)) &&
			EmailApprovalDetailsSchema.url(link.url)
		);
	}

	private static url(value: unknown): boolean {
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
