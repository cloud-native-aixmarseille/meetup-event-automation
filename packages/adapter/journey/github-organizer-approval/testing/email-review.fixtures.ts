import type { OrganizerApprovalRequest } from "@meetup-automation/journey";
import { request } from "./approval.fixtures.js";

export const emailReviewRequest = {
	...request,
	recipientCount: 1,
	details: {
		mailKind: "host-introduction",
		parameters: {
			eventDate: "2099-06-08",
			eventMeetupUrl: "https://www.meetup.com/example/events/123",
			eventSlidesUrl: "https://docs.google.com/presentation/d/example/edit",
		},
		emails: [
			{
				kind: "host-introduction",
				recipientName: "Example Host",
				links: [],
				omittedLinks: 0,
			},
		],
		omittedEmails: 0,
	},
} satisfies OrganizerApprovalRequest;

export function emailReviewFor(
	mailKind: import("@meetup-automation/communication").MailCommunicationKind,
): OrganizerApprovalRequest {
	return {
		...emailReviewRequest,
		revision: {
			"host-introduction": "a",
			"speaker-introduction": "b",
			"host-thanks": "c",
			"speaker-thanks": "d",
		}[mailKind].repeat(64),
		kind: mailKind.endsWith("-thanks") ? "email-thanks" : "email-introduction",
		details: {
			...emailReviewRequest.details,
			mailKind,
			emails: [
				{
					...emailReviewRequest.details.emails[0],
					kind: mailKind,
					links:
						mailKind === "speaker-thanks"
							? [
									{
										kind: "feedback" as const,
										title: "Reliable platforms",
										url: "https://openfeedback.io/example/0/talk?displayVotes=true",
									},
								]
							: [],
				},
			],
		},
	};
}
