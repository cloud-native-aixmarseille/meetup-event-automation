import type { CommunityEvent } from "../src/application/community-event-ports.js";
export const communityEvent: CommunityEvent = {
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
