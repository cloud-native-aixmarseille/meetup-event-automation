import { describe, expect, it } from "vitest";
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

describe("approval request identity", () => {
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
		const same = ApprovalRequestPolicy.matches(request, reordered, "pending");

		// Assert
		expect(same).toBe(true);
	});

	it.each(["pending", "approved", "rejected"] as const)(
		"keeps the batch revision authoritative for %s decisions",
		(status) => {
			// Arrange
			const changed = { ...request, revision: "b".repeat(64) };

			// Act
			const same = ApprovalRequestPolicy.matches(request, changed, status);

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
			const same = ApprovalRequestPolicy.matches(request, changed, status);

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
		const validate = () => ApprovalRequestPolicy.validate(input);

		// Assert
		expect(validate).toThrow();
	});
});
