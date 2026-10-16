import type {
	ApprovalEmailDetail,
	OrganizerApprovalDetails,
} from "@meetup-automation/journey";

export class ApprovalDetails {
	static validate(
		details: OrganizerApprovalDetails | undefined,
		recipientCount: number,
	): void {
		if (details === undefined) return;
		if (
			!details ||
			!Array.isArray(details.emails) ||
			details.emails.length > 20 ||
			!ApprovalDetails.count(details.omittedEmails) ||
			details.emails.length + details.omittedEmails !== recipientCount ||
			JSON.stringify(details).length > 12_000 ||
			!details.emails.every(ApprovalDetails.email)
		)
			throw new Error("Invalid approval details");
	}

	private static email(email: ApprovalEmailDetail): boolean {
		return Boolean(
			email &&
				[
					"host-introduction",
					"speaker-introduction",
					"host-thanks",
					"speaker-thanks",
				].includes(email.kind) &&
				ApprovalDetails.text(email.recipientName) &&
				ApprovalDetails.count(email.omittedLinks) &&
				Array.isArray(email.links) &&
				email.links.length <= 8 &&
				email.links.every(
					(link) =>
						link &&
						["meetup", "community", "slides", "feedback"].includes(link.kind) &&
						(link.title === undefined || ApprovalDetails.text(link.title)) &&
						ApprovalDetails.url(link.url),
				),
		);
	}

	private static text(value: unknown): value is string {
		return (
			typeof value === "string" &&
			value.length <= 200 &&
			!/[\r\n]/.test(value) &&
			!value.includes("\0")
		);
	}

	private static count(value: unknown): boolean {
		return (
			typeof value === "number" && Number.isSafeInteger(value) && value >= 0
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
