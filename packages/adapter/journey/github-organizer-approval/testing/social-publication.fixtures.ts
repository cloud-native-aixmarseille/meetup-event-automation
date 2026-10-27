import type { OrganizerApprovalRequest } from "@meetup-automation/journey";

export const socialPublicationRequest = {
	kind: "social-publication",
	revision: "d".repeat(64),
	eventDate: "2099-06-08",
	requestedAt: "2099-06-01T10:00:00Z",
	social: {
		intentId: "event-announcement-channel-one",
		target: "slack:community:announcement",
		destinationLabel: "Community channel",
		destinationIdentity: "T123/C123",
		text: "Join the meetup: https://www.meetup.com/example/events/12345/",
		media: [],
		plannedAt: "2099-06-01T10:00:00Z",
		expiresAt: "2099-06-08T16:30:00Z",
	},
} satisfies OrganizerApprovalRequest;
