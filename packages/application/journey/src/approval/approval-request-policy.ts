import type { OrganizerApprovalRequest } from "../ports/organizer-approval.js";
import type { OrganizerApprovalDetails } from "../ports/organizer-approval-details.js";
import type { ApprovalValueFingerprint } from "./approval-value-fingerprint.js";

/** An approval authorizes a revision and its reviewed values. */
export class ApprovalRequestPolicy {
	constructor(
		private readonly fingerprints: Pick<ApprovalValueFingerprint, "digest">,
	) {}
	scope(request: OrganizerApprovalRequest): string {
		if (request.kind === "content-review")
			return `content:${request.content.key}`;
		if (request.kind === "social-publication")
			return `social:${request.social.intentId}:${request.social.recovery ? "recovery" : "publication"}`;
		if (request.details?.mailKind) return `email:${request.details.mailKind}`;
		return request.kind;
	}
	canReplaceCombinedEmail(
		previous: OrganizerApprovalRequest,
		input: OrganizerApprovalRequest,
		decided: boolean,
	): boolean {
		return (
			!decided &&
			input.kind === "email-introduction" &&
			Boolean(input.details?.mailKind) &&
			previous.kind === "email-introduction" &&
			!previous.details?.mailKind
		);
	}

	resolved(facts: {
		readonly decided: boolean;
		readonly deliveryRequired?: boolean;
		readonly delivery?: readonly import("../ports/email-delivery-report.js").EmailDeliverySummary[];
		readonly recipientCount?: number;
		readonly followUp?: {
			readonly active: boolean;
			readonly pendingTasks: readonly string[];
		};
		readonly attentionPending: boolean;
	}): boolean {
		if (facts.attentionPending) return false;
		if (
			facts.deliveryRequired &&
			(!facts.delivery ||
				facts.delivery.some((item) => item.status !== "accepted") ||
				facts.delivery.reduce((count, item) => count + item.count, 0) <
					(facts.recipientCount ?? 0))
		)
			return false;
		if (facts.followUp?.active && facts.followUp.pendingTasks.length > 0)
			return false;
		return (
			this.reviewPhase({
				recipientCount: facts.recipientCount,
				followUpActive: facts.followUp?.active,
				decided: facts.decided,
			}) !== "pending"
		);
	}

	reviewPhase(facts: {
		readonly recipientCount?: number;
		readonly followUpActive?: boolean;
		readonly decided: boolean;
	}): "inactive" | "final" | "pending" {
		if (facts.recipientCount === 0 || facts.followUpActive !== undefined)
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
			request.kind === "meetup-slides" ||
			request.kind === "meetup-publication" ||
			request.kind === "community-publication" ||
			request.kind === "social-publication" ||
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
			request.details?.mailKind &&
			!request.details.mailKind.endsWith(request.kind.replace("email-", "-"))
		)
			throw new Error("Invalid email approval scope");
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
			this.scope(previous) !== this.scope(request) ||
			previous.revision !== request.revision ||
			previous.eventDate !== request.eventDate
		)
			return false;
		if (previous.kind === "meetup-slides" && request.kind === "meetup-slides")
			return (
				this.fingerprints.digest(previous.slides) ===
				this.fingerprints.digest(request.slides)
			);
		if (previous.kind === "content-review" && request.kind === "content-review")
			return (
				this.fingerprints.digest(previous.content) ===
				this.fingerprints.digest(request.content)
			);
		if (
			previous.kind === "social-publication" &&
			request.kind === "social-publication"
		)
			return (
				this.fingerprints.digest(previous.social) ===
				this.fingerprints.digest(request.social)
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
			this.sameMessages(previous.details, request.details) &&
			(status !== "pending" ||
				this.sameDetails(previous.details, request.details))
		);
	}

	emailParametersChanged(
		original: import("./email-review-parameters.js").EmailReviewParameters,
		edited: import("./email-review-parameters.js").EmailReviewParameters,
	): boolean {
		return (
			this.fingerprints.digest(original) !== this.fingerprints.digest(edited)
		);
	}

	private sameMessages(
		left: OrganizerApprovalDetails | undefined,
		right: OrganizerApprovalDetails | undefined,
	): boolean {
		return (
			this.fingerprints.digest(
				left?.emails.flatMap((email) =>
					email.message ? [email.message] : [],
				) ?? [],
			) ===
			this.fingerprints.digest(
				right?.emails.flatMap((email) =>
					email.message ? [email.message] : [],
				) ?? [],
			)
		);
	}

	private sameDetails(
		left: OrganizerApprovalDetails | undefined,
		right: OrganizerApprovalDetails | undefined,
	): boolean {
		if (!left || !right) return left === right;
		return (
			left.mailKind === right.mailKind &&
			this.fingerprints.digest(left.parameters ?? {}) ===
				this.fingerprints.digest(right.parameters ?? {}) &&
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
