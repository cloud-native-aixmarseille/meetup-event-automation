import type { OrganizerApprovalRequest } from "../ports/organizer-approval.js";
import type { OrganizerApprovalDetails } from "../ports/organizer-approval-details.js";
import type { ApprovalValueFingerprint } from "./approval-value-fingerprint.js";

/** An approval authorizes a revision and its reviewed public facts. */
export class ApprovalRequestPolicy {
	constructor(
		private readonly fingerprints: Pick<ApprovalValueFingerprint, "digest">,
	) {}
	reviewPhase(facts: {
		readonly recipientCount?: number;
		readonly followUpActive?: boolean;
		readonly decided: boolean;
	}): "inactive" | "final" | "pending" {
		if (facts.recipientCount === 0 || facts.followUpActive === false)
			return "inactive";
		return facts.decided ? "final" : "pending";
	}

	validateSnapshot(
		request: OrganizerApprovalRequest,
		facts: { readonly hasFollowUp: boolean; readonly decided: boolean },
	): void {
		if (facts.hasFollowUp && request.kind !== "email-thanks")
			throw new Error("Invalid post-event approval kind");
		if (request.recipientCount === 0 && facts.hasFollowUp) {
			this.validateIdentity(request);
			this.validateEmailCount(request);
		} else this.validate(request);
		if (facts.decided && request.recipientCount === 0)
			throw new Error("Invalid final approval decision");
	}

	validate(request: OrganizerApprovalRequest): void {
		this.validateIdentity(request);
		if (
			request.kind === "meetup-publication" ||
			request.kind === "community-publication" ||
			request.kind === "content-review"
		)
			return;
		if (
			!Number.isSafeInteger(request.recipientCount) ||
			request.recipientCount <= 0
		)
			throw new Error("Invalid approval recipient count");
		this.validateEmailCount(request);
	}

	validateIdentity(
		request: Pick<
			OrganizerApprovalRequest,
			"revision" | "eventDate" | "requestedAt"
		>,
	): void {
		const date = new Date(`${request.eventDate}T12:00:00Z`);
		if (
			!/^[a-f0-9]{64}$/.test(request.revision) ||
			!/^\d{4}-\d{2}-\d{2}$/.test(request.eventDate) ||
			!Number.isFinite(date.getTime()) ||
			date.toISOString().slice(0, 10) !== request.eventDate ||
			!Number.isFinite(Date.parse(request.requestedAt))
		)
			throw new Error("Invalid approval request");
	}

	validateEmailCount(
		request: Extract<
			OrganizerApprovalRequest,
			{ kind: "email-introduction" | "email-thanks" }
		>,
	): void {
		if (
			request.details &&
			request.details.emails.length + request.details.omittedEmails !==
				request.recipientCount
		)
			throw new Error("Invalid approval details");
	}

	matches(
		previous: OrganizerApprovalRequest,
		request: OrganizerApprovalRequest,
		status: "pending" | "approved" | "rejected" | "iteration-requested",
	): boolean {
		if (
			previous.kind !== request.kind ||
			previous.revision !== request.revision ||
			previous.eventDate !== request.eventDate
		)
			return false;
		if (previous.kind === "content-review" && request.kind === "content-review")
			return (
				this.fingerprints.digest(previous.content) ===
				this.fingerprints.digest(request.content)
			);
		if (
			(previous.kind === "meetup-publication" ||
				previous.kind === "community-publication") &&
			(request.kind === "meetup-publication" ||
				request.kind === "community-publication")
		)
			return (
				previous.publication.url === request.publication.url &&
				previous.publication.title === request.publication.title &&
				previous.publication.startTime === request.publication.startTime &&
				previous.publication.endTime === request.publication.endTime &&
				previous.publication.timeZone === request.publication.timeZone &&
				previous.publication.venue.name === request.publication.venue.name &&
				previous.publication.venue.city === request.publication.venue.city
			);
		return (
			previous.recipientCount === request.recipientCount &&
			(status !== "pending" ||
				this.sameDetails(previous.details, request.details))
		);
	}

	private sameDetails(
		left: OrganizerApprovalDetails | undefined,
		right: OrganizerApprovalDetails | undefined,
	): boolean {
		if (!left || !right) return left === right;
		return (
			left.omittedEmails === right.omittedEmails &&
			left.emails.length === right.emails.length &&
			left.emails.every((email, index) => {
				const other = right.emails[index];
				return (
					other !== undefined &&
					email.kind === other.kind &&
					email.recipientName === other.recipientName &&
					email.omittedLinks === other.omittedLinks &&
					email.links.length === other.links.length &&
					email.links.every((link, linkIndex) => {
						const otherLink = other.links[linkIndex];
						return (
							otherLink !== undefined &&
							link.kind === otherLink.kind &&
							link.url === otherLink.url &&
							link.title === otherLink.title
						);
					})
				);
			})
		);
	}
}
