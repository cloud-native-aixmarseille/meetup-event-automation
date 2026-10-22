import type { OrganizerApprovalDetails } from "@meetup-automation/journey";

/** Fit public email facts into GitHub's comment and escaped metadata budget. */
export class ApprovalDetailsPreview {
	create(details: OrganizerApprovalDetails): OrganizerApprovalDetails {
		const emails = details.emails.slice(0, 20).map((email) => ({
			...email,
			recipientName: this.text(email.recipientName),
			links: email.links.slice(0, 8).map((link) => ({
				...link,
				...(link.title === undefined ? {} : { title: this.text(link.title) }),
			})),
			omittedLinks: email.omittedLinks + Math.max(email.links.length - 8, 0),
		}));
		// JSON size is a storage budget, not request equality or an authorization key.
		while (JSON.stringify(emails).length > 4_000) {
			const largest = [...emails].sort(
				(a, b) => JSON.stringify(b).length - JSON.stringify(a).length,
			)[0];
			if (largest?.links.length) {
				largest.links.pop();
				largest.omittedLinks++;
			} else {
				emails.pop();
			}
		}
		return {
			emails,
			omittedEmails:
				details.omittedEmails + details.emails.length - emails.length,
		};
	}

	private text(value: string): string {
		const normalized = value.trim().replace(/\s+/g, " ");
		return normalized.length <= 200
			? normalized
			: `${normalized.slice(0, 197)}...`;
	}
}
