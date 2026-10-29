import type { CommunityEvent } from "../src/application/community-event-ports.js";
export const communityEvent: CommunityEvent = {
	meetupUrl: "https://www.meetup.com/example/events/12345/",
	cover: {
		id: "cover",
		url: "https://images.example.test/cover.png",
		fingerprint: "a".repeat(64),
		description: "Approved illustration",
		mimeType: "image/png",
		width: 1792,
		height: 1024,
		sourceRevision: "reviewed",
	},
	speakers: [
		{
			userId: "50000000-0000-4000-8000-000000000005",
			username: "example-speaker",
		},
	],
	sponsor: {
		id: "60000000-0000-4000-8000-000000000006",
		name: "Example Sponsor",
		level: "Host",
	},
	title: "Example evening",
	description: "Public agenda",
	date: "2099-11-20",
	startTime: "18:45",
	endTime: "20:45",
	timeZone: "Europe/Paris",
	categoryId: "40000000-0000-4000-8000-000000000004",
	venue: {
		name: "Example Venue",
		address: "1 Example Road",
		city: "Example City",
		zipCode: "10000",
		state: "Example State",
		country: "France",
		countryCode: "FR",
	},
	registration: {
		capacity: 75,
		waitlist: true,
		approvalRequired: false,
		reminder: true,
	},
};
