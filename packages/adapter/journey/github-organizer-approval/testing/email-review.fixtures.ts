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
