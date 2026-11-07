import type { MailMessageIntent } from "@meetup-automation/communication";
import { describe, expect, it } from "vitest";
import { event } from "../../testing/meetup-journey.fixtures.js";
import { CommunicationApprovalDetails } from "./communication-approval-details.js";

const mail: MailMessageIntent = {
	channel: "mail",
	kind: "speaker-introduction",
	intentId: "intent-1",
	idempotencyKey: "intent-1",
	repositoryId: "repo-1",
	eventId: "event-1",
	policyVersion: "1",
	recipientId: "speaker-0001",
	templateName: "meetup-intro-speakers",
	recipient: {
		channel: "mail",
		role: "speaker",
		recipientId: "speaker-0001",
		email: "private@example.invalid",
		receivesCommunications: true,
	},
	placeholders: {
		speakerName: "Private Contact Name",
		hostingAddress: "1 Public Street, 13001 Marseille",
		unknown: "private value",
		eventMeetupUrl: "https://www.meetup.com/example/events/123",
		eventCncfUrl: "https://ocgroups.dev/example",
		eventSlidesUrl: "https://docs.google.com/presentation/d/example/edit",
	},
};

describe("complete email approval details", () => {
	it("captures the exact destination, template and all planned placeholders", () => {
		// Arrange
		const mails = [mail];

		// Act
		const details = new CommunicationApprovalDetails().create(event, mails, {});

		// Assert
		expect(details).toEqual({
			emails: [
				{
					kind: "speaker-introduction",
					recipientName: "Example Speaker",
					message: {
						recipientEmail: mail.recipient.email,
						templateName: mail.templateName,
						idempotencyKey: mail.idempotencyKey,
						placeholders: mail.placeholders,
						parameterKeys: [],
					},
					links: [
						{ kind: "meetup", url: mail.placeholders.eventMeetupUrl },
						{ kind: "community", url: mail.placeholders.eventCncfUrl },
						{ kind: "slides", url: mail.placeholders.eventSlidesUrl },
					],
					omittedLinks: 0,
				},
			],
			omittedEmails: 0,
		});
		expect(details.emails[0]?.message?.placeholders).not.toBe(
			mail.placeholders,
		);
	});

	it("shows only that speaker's feedback links for a thank-you email", () => {
		// Arrange
		const thanks: MailMessageIntent = {
			...mail,
			kind: "speaker-thanks",
			templateName: "meetup-thanks-speakers",
			placeholders: {
				...mail.placeholders,
				speakerFeedbackTalks: [
					{
						title: "Reliable platforms",
						url: "https://openfeedback.io/event/0/talk?displayVotes=true",
					},
				],
			},
		};

		// Act
		const details = new CommunicationApprovalDetails().create(
			event,
			[thanks],
			{},
		);

		// Assert
		expect(details.emails[0]?.links).toEqual([
			{
				kind: "feedback",
				title: "Reliable platforms",
				url: "https://openfeedback.io/event/0/talk?displayVotes=true",
			},
		]);
	});

	it("identifies the host and records the contact delivery values", () => {
		// Arrange
		const hosting: MailMessageIntent = {
			...mail,
			kind: "host-thanks",
			recipient: { ...mail.recipient, role: "hosting" },
			templateName: "meetup-thanks-hosting",
		};

		// Act
		const details = new CommunicationApprovalDetails().create(
			event,
			[hosting],
			{},
		);

		// Assert
		expect(details.emails[0]).toEqual({
			kind: "host-thanks",
			recipientName: "Example Host",
			message: {
				recipientEmail: hosting.recipient.email,
				templateName: hosting.templateName,
				idempotencyKey: hosting.idempotencyKey,
				placeholders: hosting.placeholders,
				parameterKeys: [],
			},
			links: [],
			omittedLinks: 0,
		});
	});

	it("projects the complete batch independently of a notification channel budget", () => {
		// Arrange
		const mails: MailMessageIntent[] = Array.from(
			{ length: 30 },
			(_, index) => ({
				...mail,
				idempotencyKey: `intent-${index}`,
				kind: "speaker-thanks",
				templateName: "meetup-thanks-speakers",
				placeholders: {
					speakerFeedbackTalks: Array.from({ length: 12 }, (_, talk) => ({
						title: `Talk ${talk}`,
						url: `https://openfeedback.io/event/0/${"a".repeat(1500)}-${talk}`,
					})),
				},
			}),
		);

		// Act
		const details = new CommunicationApprovalDetails().create(event, mails, {});

		// Assert
		expect(details.emails.length + details.omittedEmails).toBe(30);
		expect(details.omittedEmails).toBe(0);
		expect(details.emails).toHaveLength(30);

		for (const email of details.emails)
			expect(email.links.length + email.omittedLinks).toBe(12);
	});
});

it("keeps recipient overrides separate from editable shared defaults", () => {
	// Arrange
	const overridden = {
		...mail,
		recipient: { ...mail.recipient, placeholders: { eventDate: "2099-07-01" } },
		placeholders: { ...mail.placeholders, eventDate: "2099-07-01" },
	};
	// Act
	const details = new CommunicationApprovalDetails().create(
		event,
		[overridden],
		{
			eventDate: "2099-06-08",
			eventSlidesUrl: String(mail.placeholders.eventSlidesUrl),
		},
	);
	// Assert
	expect(details.emails[0]?.message?.parameterKeys).toEqual(["eventSlidesUrl"]);
	expect(details.emails[0]?.message?.placeholders.eventDate).toBe("2099-07-01");
});
