import { describe, expect, it } from "vitest";
import type { OrganizerApprovalRequest } from "../ports/organizer-approval.js";
import { ApprovalNotificationPolicy } from "./approval-notification-policy.js";

const identity = {
	revision: "a".repeat(64),
	eventDate: "2099-06-08",
	requestedAt: "2099-06-01T10:00:00.000Z",
};

describe("approval notification policy", () => {
	it("includes only the date and recipient count for introduction approvals", () => {
		// Arrange
		const request = {
			...identity,
			kind: "email-introduction",
			recipientCount: 2,
			details: { emails: [], omittedEmails: 2 },
		} satisfies OrganizerApprovalRequest;
		const stored = {
			...request,
			requestId: "private-storage-id",
			actor: "private-actor",
		};

		// Act
		const facts = new ApprovalNotificationPolicy().notificationFor(stored);

		// Assert
		expect(facts).toEqual({
			kind: "email-introduction",
			eventDate: identity.eventDate,
			recipientCount: 2,
		});
	});

	it("includes only the date for Meetup publication approvals", () => {
		// Arrange
		const request = {
			...identity,
			kind: "meetup-publication",
			publication: {
				url: "https://www.meetup.com/example/events/12345/",
				title: "Example event",
				startTime: "18:30",
				endTime: "20:30",
				timeZone: "Europe/Paris",
				venue: { name: "Example venue", city: "Marseille" },
			},
		} satisfies OrganizerApprovalRequest;

		// Act
		const facts = new ApprovalNotificationPolicy().notificationFor(request);

		// Assert
		expect(facts).toEqual({
			kind: "meetup-publication",
			eventDate: identity.eventDate,
		});
	});

	it("leaves thank-you approval notifications to follow-up attention", () => {
		// Arrange
		const request = {
			...identity,
			kind: "email-thanks",
			recipientCount: 2,
		} satisfies OrganizerApprovalRequest;

		// Act
		const facts = new ApprovalNotificationPolicy().notificationFor(request);

		// Assert
		expect(facts).toBeUndefined();
	});
});
