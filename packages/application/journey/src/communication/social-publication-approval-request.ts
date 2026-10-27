import type {
	SocialDeliveryRecord,
	SocialPostTiming,
} from "@meetup-automation/communication";
import type { OrganizerApprovalRequest } from "../ports/organizer-approval.js";
import type { ContentProposal } from "../proposals/promotional-content.js";
import type { PromotionalContentFingerprint } from "../proposals/promotional-content-fingerprint.js";

export class SocialPublicationApprovalRequest {
	constructor(
		private readonly timing: Pick<SocialPostTiming, "expiresAt">,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"digest"
		>,
	) {}
	request(
		proposal: ContentProposal,
		record: SocialDeliveryRecord,
	): Extract<OrganizerApprovalRequest, { kind: "social-publication" }> {
		const destination = proposal.plan.destination;
		if (!destination || !proposal.draft || !proposal.revision)
			throw new Error("Social draft is incomplete");
		const expiresAt = this.timing.expiresAt(proposal.plan);
		const social = {
			intentId: record.intentId,
			target: proposal.plan.target,
			destinationLabel: destination.label,
			destinationIdentity:
				destination.provider === "slack"
					? `${destination.workspaceId}/${destination.channelId}`
					: destination.organizationUrn,
			text: proposal.draft.text,
			media: proposal.draft.media,
			plannedAt: proposal.plan.plannedAt ?? "after-approval",
			expiresAt,
		};
		return {
			kind: "social-publication",
			revision: this.fingerprints.digest({
				social,
				proposalRevision: proposal.revision,
				source: proposal.plan.sourceFingerprint,
			}),
			eventDate: proposal.plan.facts.date,
			requestedAt: proposal.createdAt,
			social,
		};
	}
}
