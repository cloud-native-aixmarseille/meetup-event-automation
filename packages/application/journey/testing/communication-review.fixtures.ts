import {
	CommunicationDomainComposition,
	type DeliveryLedgerEntry,
	type ReconcileCommunicationsInput,
} from "@meetup-automation/communication";
import { vi } from "vitest";
import { EmailReviewParameterPolicy } from "../src/approval/email-review-parameters.js";
import type {
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "../src/ports/organizer-approval.js";
import { CommunicationApprovalDetails } from "../src/use-cases/communication-approval-details.js";

export function communicationReviewFixture() {
	const domain = new CommunicationDomainComposition();
	const entries = new Map<string, DeliveryLedgerEntry>();
	const ledger = {
		find: vi.fn(async (key: string) => entries.get(key)),
		reservePending: vi.fn(
			async (reservation: {
				idempotencyKey: string;
				intentId: string;
				reservedAt: string;
			}) => {
				const entry = {
					idempotencyKey: reservation.idempotencyKey,
					intentId: reservation.intentId,
					status: "pending" as const,
					updatedAt: reservation.reservedAt,
				};
				entries.set(entry.idempotencyKey, entry);
				return { reserved: true as const, entry };
			},
		),
		markAccepted: vi.fn(async (key: string, updatedAt: string) => {
			const entry = entries.get(key);
			if (entry) entries.set(key, { ...entry, status: "accepted", updatedAt });
		}),
		markUncertain: vi.fn(),
		markRejected: vi.fn(),
		releasePending: vi.fn(),
	};
	const gateway = {
		dispatch: vi.fn(async () => ({ outcome: "accepted" as const })),
	};
	const planner = domain.planCommunications();
	const clock = { now: () => new Date("2099-06-01T10:00:00Z") };
	const reconciler = domain.reconcileCommunications({
		planner,
		clock,
		ledger,
		mailGateway: gateway,
	});
	const approvals = {
		request: vi
			.fn<
				(input: OrganizerApprovalRequest) => Promise<OrganizerApprovalResult>
			>()
			.mockResolvedValue({ status: "pending", notificationFailed: false }),
		synchronize: vi.fn().mockResolvedValue({ notificationFailed: false }),
	};
	const input: ReconcileCommunicationsInput = {
		mode: "dispatch",
		dispatchAuthorized: false,
		repositoryId: "example/meetups",
		eventId: "issue-42",
		eventDate: "2099-06-08",
		timeZone: "Europe/Paris",
		readiness: "ready",
		occurrenceStatus: "scheduled",
		policyVersion: "1",
		mailPlaceholders: {
			eventDate: "2099-06-08",
			eventMeetupUrl: "https://www.meetup.com/example/events/123",
			eventSlidesUrl: "https://docs.google.com/presentation/d/example/edit",
		},
		mailRecipients: [
			{
				channel: "mail",
				role: "hosting",
				recipientId: "host-0001",
				receivesCommunications: true,
				email: "private-host@example.test",
				placeholders: { firstName: "Private contact" },
			},
			{
				channel: "mail",
				role: "speaker",
				recipientId: "speaker-0001",
				receivesCommunications: true,
				email: "private-speaker@example.test",
				placeholders: { firstName: "Private speaker" },
			},
		],
	};
	return {
		input,
		approvals,
		clock,
		reconciler,
		gateway,
		ledger,
		collaborators: {
			planner,
			mailBatchFingerprint: domain.mailBatchFingerprint(),
			communicationApprovalDetails: new CommunicationApprovalDetails(),
			parameters: new EmailReviewParameterPolicy(),
		},
	};
}
