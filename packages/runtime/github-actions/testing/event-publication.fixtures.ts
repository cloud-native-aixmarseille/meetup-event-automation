export function eventPublicationConfigurationFixture() {
	return {
		version: 1,
		startTime: "18:45",
		endTime: "20:45",
		venues: {
			"host-0001": {
				name: "Example Venue",
				city: "Example City",
				address: "1 Example Road",
				zipCode: "10000",
				state: "Example State",
				country: "France",
				countryCode: "FR",
			},
		},
		destinations: [
			{ provider: "meetup" },
			{
				provider: "ocgroups",
				eventUrlPrefix:
					"https://community.example.test/cncf/group/example/event/",
				communityId: "20000000-0000-4000-8000-000000000002",
				groupId: "30000000-0000-4000-8000-000000000003",
				categoryId: "40000000-0000-4000-8000-000000000004",
				registration: {
					capacity: 75,
					waitlist: true,
					approvalRequired: false,
					reminder: true,
				},
			},
		],
	};
}

export function publicationCredentialsFixture() {
	return {
		meetup: {
			email: "organizer@example.test",
			password: " synthetic-meetup-password ",
			ai: {
				provider: "gemini",
				model: "synthetic-vision-model",
				apiKey: "synthetic-ai-key",
			},
		},
		ocgroups: {
			username: "example-organizer",
			password: " synthetic-ocgroups-password ",
		},
	};
}
