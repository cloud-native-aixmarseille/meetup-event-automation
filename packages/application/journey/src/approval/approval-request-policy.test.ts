import { describe, expect, it } from "vitest";
import { DraftProposalComposition } from "../draft-proposal-composition.js";
import type { OrganizerApprovalRequest } from "../ports/organizer-approval.js";
import { ApprovalRequestPolicy } from "./approval-request-policy.js";

const request = {
	kind: "email-introduction",
	revision: "a".repeat(64),
	eventDate: "2099-06-08",
	requestedAt: "2099-06-01T10:00:00.000Z",
	recipientCount: 1,
	details: {
		emails: [
			{
				kind: "speaker-introduction",
				recipientName: "Alex Example",
				links: [{ kind: "slides", url: "https://example.test/slides" }],
				omittedLinks: 0,
			},
		],
		omittedEmails: 0,
	},
} satisfies OrganizerApprovalRequest;

describe("approval review eligibility", () => {
	it.each([
		"accepted",
		"pending",
		"uncertain",
		"not-sent",
		"rejected",
	] as const)(
		"resolves email approvals only after complete accepted delivery (%s)",
		(status) => {
			// Arrange
			const policy = new ApprovalRequestPolicy(
				new DraftProposalComposition().fingerprints(),
			);
			// Act
			const resolved = policy.resolved({
				decided: true,
				recipientCount: 2,
				attentionPending: false,
				deliveryRequired: true,
				delivery: [{ kind: "speaker-introduction", status, count: 2 }],
			});
			const partial = policy.resolved({
				decided: true,
				recipientCount: 3,
				attentionPending: false,
				deliveryRequired: true,
				delivery: [{ kind: "speaker-introduction", status, count: 2 }],
			});
			// Assert
			expect(resolved).toBe(status === "accepted");
			expect(partial).toBe(false);
		},
	);
	it.each([
		[{ recipientCount: 0, decided: false }, "inactive"],
		[{ recipientCount: 1, followUpActive: false, decided: false }, "inactive"],
		[{ recipientCount: 2, followUpActive: true, decided: false }, "inactive"],
		[{ recipientCount: 1, decided: true }, "final"],
		[{ recipientCount: 1, decided: false }, "pending"],
		[{ decided: false }, "pending"],
	] as const)("classifies review facts %j", (facts, expected) => {
		// Arrange
		const policy = new ApprovalRequestPolicy(
			new DraftProposalComposition().fingerprints(),
		);

		// Act
		const phase = policy.reviewPhase(facts);

		// Assert
		expect(phase).toBe(expected);
	});
	it("rejects a recorded decision on an empty follow-up placeholder", () => {
		// Arrange
		const policy = new ApprovalRequestPolicy(
			new DraftProposalComposition().fingerprints(),
		);
		const placeholder = {
			...request,
			kind: "email-thanks" as const,
			recipientCount: 0,
			details: undefined,
		};

		// Act
		const validate = () =>
			policy.validateSnapshot(placeholder, {
				hasFollowUp: true,
				decided: true,
			});

		// Assert
		expect(validate).toThrow("Invalid final approval decision");
	});
});

describe("approval request identity", () => {
	it("invalidates social publication authority when a destination changes without a revision update", () => {
		// Arrange
		const request = {
			kind: "social-publication",
			revision: "d".repeat(64),
			eventDate: "2099-06-08",
			requestedAt: "2099-06-01T10:00:00Z",
			social: {
				intentId: "delivery-one",
				target: "announcement",
				destinationLabel: "Community",
				destinationIdentity: "T123/C123",
				text: "Public reviewed message",
				media: [],
				plannedAt: "2099-06-01T10:00:00Z",
				expiresAt: "2099-06-08T17:00:00Z",
			},
		} satisfies OrganizerApprovalRequest;
		const changed = {
			...request,
			social: { ...request.social, destinationIdentity: "T123/C999" },
		};
		const policy = new ApprovalRequestPolicy(
			new DraftProposalComposition().fingerprints(),
		);

		// Act
		const same = policy.matches(request, changed, "approved");

		// Assert
		expect(same).toBe(false);
	});
	it("compares reviewed facts independently of object property order and request time", () => {
		// Arrange
		const reordered = {
			...request,
			requestedAt: "2099-06-02T10:00:00.000Z",
			details: {
				omittedEmails: 0,
				emails: [
					{
						omittedLinks: 0,
						links: [
							{ url: "https://example.test/slides", kind: "slides" as const },
						],
						recipientName: "Alex Example",
						kind: "speaker-introduction" as const,
					},
				],
			},
		};

		// Act
		const same = new ApprovalRequestPolicy(
			new DraftProposalComposition().fingerprints(),
		).matches(request, reordered, "pending");

		// Assert
		expect(same).toBe(true);
	});

	it.each(["pending", "approved", "rejected"] as const)(
		"keeps the batch revision authoritative for %s decisions",
		(status) => {
			// Arrange
			const changed = { ...request, revision: "b".repeat(64) };

			// Act
			const same = new ApprovalRequestPolicy(
				new DraftProposalComposition().fingerprints(),
			).matches(request, changed, status);

			// Assert
			expect(same).toBe(false);
		},
	);

	it.each(["pending", "approved", "rejected"] as const)(
		"compares pending summary edits without invalidating final %s decisions",
		(status) => {
			// Arrange
			const changed = { ...request, details: undefined };

			// Act
			const same = new ApprovalRequestPolicy(
				new DraftProposalComposition().fingerprints(),
			).matches(request, changed, status);

			// Assert
			expect(same).toBe(status !== "pending");
		},
	);

	it.each([
		{ recipientCount: 0 },
		{ recipientCount: 2 },
		{ eventDate: "2099-02-30" },
		{ revision: "unknown" },
		{ requestedAt: "unknown" },
	])("rejects invalid request invariants: %j", (override) => {
		// Arrange
		const input = { ...request, ...override };

		// Act
		const validate = () =>
			new ApprovalRequestPolicy(
				new DraftProposalComposition().fingerprints(),
			).validate(input);

		// Assert
		expect(validate).toThrow();
	});
});

describe("approval comment completion", () => {
	it.each([
		[false, undefined, undefined, false, false],
		[true, undefined, undefined, false, true],
		[true, 1, { active: true, pendingTasks: ["share-slides"] }, false, false],
		[true, 1, { active: true, pendingTasks: [] }, false, true],
		[false, 0, { active: true, pendingTasks: [] }, false, true],
		[false, 0, { active: true, pendingTasks: [] }, true, false],
		[true, 1, { active: false, pendingTasks: ["share-slides"] }, true, false],
	])(
		"keeps unfinished approval or follow-up work visible %#",
		(decided, recipientCount, followUp, attentionPending, expected) => {
			// Arrange
			const policy = new ApprovalRequestPolicy(
				new DraftProposalComposition().fingerprints(),
			);

			// Act
			const resolved = policy.resolved({
				decided,
				recipientCount,
				followUp,
				attentionPending,
			});

			// Assert
			expect(resolved).toBe(expected);
		},
	);
});

describe("email approval scopes", () => {
	it.each([
		"host-introduction",
		"speaker-introduction",
		"host-thanks",
		"speaker-thanks",
	] as const)("validates the phase of %s", (mailKind) => {
		// Arrange
		const policy = new ApprovalRequestPolicy(
			new DraftProposalComposition().fingerprints(),
		);
		const kind = mailKind.endsWith("-thanks")
			? "email-thanks"
			: "email-introduction";
		const input = {
			...request,
			kind,
			details: { ...request.details, mailKind },
		} satisfies OrganizerApprovalRequest;
		// Act
		const validate = () => policy.validate(input);
		const mismatch = () =>
			policy.validate({
				...input,
				kind: kind === "email-thanks" ? "email-introduction" : "email-thanks",
			});
		// Assert
		expect(validate).not.toThrow();
		expect(mismatch).toThrow("Invalid email approval scope");
	});
	it("does not reuse another recipient group's decision even with the same revision", () => {
		// Arrange
		const policy = new ApprovalRequestPolicy(
			new DraftProposalComposition().fingerprints(),
		);
		const host = {
			...request,
			kind: "email-thanks" as const,
			details: { ...request.details, mailKind: "host-thanks" as const },
		};
		const speaker = {
			...host,
			details: { ...host.details, mailKind: "speaker-thanks" as const },
		};
		// Act
		const matches = policy.matches(host, speaker, "approved");
		// Assert
		expect(matches).toBe(false);
	});
});
