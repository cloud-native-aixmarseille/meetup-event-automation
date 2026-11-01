import {
	SocialPostTiming,
	SocialRecoveryReference,
	type SocialDeliveryRecord,
} from "@meetup-automation/communication";
import { vi } from "vitest";
import { RecoverSocialPublication } from "../src/communication/recover-social-publication.js";
import { SocialPublicationApprovalRequest } from "../src/communication/social-publication-approval-request.js";
import type {
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "../src/ports/organizer-approval.js";
import type { ContentProposalStore } from "../src/proposals/promotional-content-ports.js";
import { contentFixture, media } from "./promotional-content.fixtures.js";

export function socialRecoveryFixture(
	provider: "slack" | "linkedin" = "slack",
) {
	const source = contentFixture(
		provider === "slack"
			? "slack-engineering:announcement"
			: "linkedin:announcement",
	);
	const draft = {
		text: "Join this meetup: https://www.meetup.com/example/events/123/",
		media: provider === "linkedin" ? [media] : [],
	};
	const proposal = {
		...source.proposal,
		publicationIntent: "a".repeat(64),
		draft,
		revision: source.fingerprints.proposal(source.proposal, draft),
	};
	const destination = proposal.plan.destination;
	if (!destination) throw new Error("Missing synthetic destination");
	const initial: SocialDeliveryRecord = {
		intentId: proposal.publicationIntent,
		occurrence: proposal.plan.facts.date,
		purpose: "announcement",
		destination,
		attempts: [
			{
				id: "attempt-one",
				revision: proposal.revision,
				reservedAt: "2026-10-20T12:00:00Z",
				status: "uncertain",
				code: "transport-uncertain",
			},
		],
	};
	let current: SocialDeliveryRecord | undefined = initial;
	const journal = {
		load: vi.fn(async () => current),
		save: vi.fn(
			async (
				previous: SocialDeliveryRecord | undefined,
				next: SocialDeliveryRecord,
			) => {
				if (
					source.fingerprints.digest(previous) !==
					source.fingerprints.digest(current)
				)
					throw new Error("Concurrent synthetic record");
				current = next;
			},
		),
	};
	const store = {
		load: vi.fn(async () => ({
			revision: "snapshot-one",
			proposals: [proposal],
		})),
		save: vi.fn<ContentProposalStore["save"]>(),
	};
	const approved: OrganizerApprovalResult = {
		status: "approved",
		notificationFailed: false,
		actor: "organizer",
		decidedAt: "2026-10-20T13:00:00Z",
	};
	const approvals = {
		request: vi.fn(
			async (
				_request: OrganizerApprovalRequest,
			): Promise<OrganizerApprovalResult> => approved,
		),
		synchronize: vi.fn(async () => ({ notificationFailed: false })),
	};
	const recovery = new RecoverSocialPublication(
		journal,
		store,
		approvals,
		new SocialPublicationApprovalRequest(
			new SocialPostTiming(),
			source.fingerprints,
		),
		new SocialRecoveryReference(),
		source.fingerprints,
	);
	return {
		source,
		proposal,
		initial,
		journal,
		store,
		approved,
		approvals,
		recovery,
		current: () => current,
		setRecord: (record: SocialDeliveryRecord | undefined) => {
			current = record;
		},
	};
}
