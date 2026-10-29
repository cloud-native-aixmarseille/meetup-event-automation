import {
	CommunityEventPolicy,
	ScheduledEventPolicy,
} from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventScheduleConfiguration } from "./event-schedule-configuration.js";
import { OcgroupsPublicationSettings } from "./ocgroups-publication-settings.js";

function fixture() {
	const runtime = new GithubActionsComposition();
	const configuration = new OcgroupsPublicationSettings(
		runtime.runtimeInput(),
		new EventScheduleConfiguration({
			runtimeInput: runtime.runtimeInput(),
			scheduledEventPolicy: new ScheduledEventPolicy(),
		}),
		new CommunityEventPolicy(new ScheduledEventPolicy()),
	);
	const input = {
		version: 1,
		eventUrlPrefix: "https://community.example.test/cncf/group/example/event/",
		communityId: "20000000-0000-4000-8000-000000000002",
		groupId: "30000000-0000-4000-8000-000000000003",
		categoryId: "40000000-0000-4000-8000-000000000004",
		speakers: {
			"speaker-0001": {
				userId: "50000000-0000-4000-8000-000000000005",
				username: "example-speaker",
			},
		},
		sponsors: {
			"host-0001": {
				id: "60000000-0000-4000-8000-000000000006",
				name: "Example Sponsor",
				level: "Host",
			},
		},
		startTime: "18:45",
		endTime: "20:45",
		registration: {
			capacity: 75,
			waitlist: true,
			approvalRequired: false,
			reminder: true,
		},
		venues: {
			"host-0001": {
				name: "Example Venue",
				address: "1 Example Road",
				city: "Example City",
				zipCode: "10000",
				state: "Example State",
				country: "France",
				countryCode: "FR",
			},
		},
	};
	return { configuration, input };
}
describe("OCGroups configuration", () => {
	it("loads an explicit target and public venue without deriving private addresses", () => {
		// Arrange
		const { configuration, input } = fixture();
		const { version: _version, ...expected } = input;
		// Act
		const result = configuration.parse(input);
		// Assert
		expect(result).toEqual(expected);
		expect(result.registration.capacity).toBe(75);
	});
	it.each([
		"eventUrlPrefix",
		"communityId",
		"groupId",
		"categoryId",
		"registration",
		"startTime",
		"endTime",
		"venues",
		"speakers",
		"sponsors",
	])("rejects a missing %s", (key) => {
		// Arrange
		const { configuration, input } = fixture();
		const missing = { ...input, [key]: undefined };
		// Act
		const action = () => configuration.parse(missing);
		// Assert
		expect(action).toThrow();
	});
	it.each([
		{
			eventUrlPrefix: "http://community.example.test/cncf/group/example/event/",
		},
		{ eventUrlPrefix: "https://community.example.test/events/" },
		{ communityId: "not-a-uuid" },
		{
			speakers: { "speaker-0001": { userId: "invalid", username: "example" } },
		},
		{
			speakers: {
				"speaker-0001": {
					userId: "50000000-0000-4000-8000-000000000005",
					username: "bad username",
				},
			},
		},
		{
			sponsors: {
				"host-0001": {
					id: "60000000-0000-4000-8000-000000000006",
					name: "Example",
					level: "",
				},
			},
		},
		{ endTime: "17:00" },
		{
			registration: {
				capacity: 75,
				waitlist: true,
				approvalRequired: true,
				reminder: true,
			},
		},
		{
			registration: { capacity: 75, waitlist: false, approvalRequired: false },
		},
		{
			venues: { "host-0001": { name: "Example Venue", city: "Example City" } },
		},
	])("rejects invalid or incomplete public settings: %j", (changes) => {
		// Arrange
		const { configuration, input } = fixture();
		// Act
		const action = () => configuration.parse({ ...input, ...changes });
		// Assert
		expect(action).toThrow();
	});
});
