import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../testing/event.fixtures.js";
import { MeetupEventMigration } from "./meetup-event-migration.js";

describe("event DTO migration", () => {
	it("clones a current DTO without migration diagnostics", () => {
		// Arrange
		const current = createTestEvent();

		// Act
		const result = MeetupEventMigration.migrateMeetupEventDto(current);

		// Assert
		expect(result.event).toEqual(current);
		expect(result.event).not.toBe(current);
		expect(result.diagnostics).toEqual([]);
	});

	it("migrates the historical parser payload without retaining presentation URLs", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = MeetupEventMigration.migrateMeetupEventDto({
			repository: "cloud-native-aixmarseille/meetups",
			issueNumber: 12,
			issueTitle: "Legacy title",
			labels: ["meetup", "hoster:confirmed"],
			followUpComplete: true,
			parsedBody: {
				event_date: "2026-11-05",
				event_title: "Legacy event",
				hoster: ["[Aix Tech Hub](https://example.com/host)"],
				event_description: "Description",
				agenda:
					"- [Ada Lovelace](https://example.com/ada), Grace Hopper [speaker-2]: Platform history: lessons learned",
				event_status: "scheduled",
			},
		});

		// Assert
		expect(result.event).toMatchObject({
			schemaVersion: 1,
			host: { displayName: "Aix Tech Hub" },
			agenda: [
				{
					speakers: [
						{ displayName: "Ada Lovelace" },
						{ id: "speaker-2", displayName: "Grace Hopper" },
					],
					description: "Platform history: lessons learned",
				},
			],
			confirmations: { host: true, speakers: false },
			logistics: {
				aperitif: "unspecified",
				postEventVenue: "unspecified",
			},
			operationalChecklists: {
				slidesAndContent: [],
				communication: [],
				postEvent: [],
			},
			followUpComplete: false,
		});
		expect(result.diagnostics[0]?.code).toBe("event.document.legacy-schema");
	});

	it("reports invalid legacy field types instead of throwing", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = MeetupEventMigration.migrateMeetupEventDto({
			repository: "cloud-native-aixmarseille/meetups",
			issueNumber: 13,
			issueTitle: "Legacy title",
			parsedBody: {
				event_date: 123,
				hoster: "not-an-array",
				agenda: ["not-a-string"],
				event_status: "finished",
			},
		});
		const actual = result.diagnostics.filter(
			(item) => item.severity === "error",
		);

		// Assert
		expect(actual).toHaveLength(4);
	});

	it.each(["cancelled", "postponed"] as const)(
		"derives %s occurrence from its operational label",
		(status) => {
			// Arrange
			const source = {
				repository: "example/meetups",
				issueNumber: 42,
				issueTitle: "Example event",
				issueState: "open" as const,
				labels: ["meetup", `event:${status}`],
				parsedBody: {},
			};

			// Act
			const result = MeetupEventMigration.migrateMeetupEventDto(source);

			// Assert
			expect(result.event.occurrenceStatus).toBe(status);
		},
	);

	it("treats a closed issue as held when no explicit occurrence label is present", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = MeetupEventMigration.migrateMeetupEventDto({
			repository: "cloud-native-aixmarseille/meetups",
			issueNumber: 17,
			issueTitle: "Legacy title",
			issueState: "closed",
			labels: ["meetup"],
			parsedBody: {},
		});

		// Assert
		expect(result.event.occurrenceStatus).toBe("held");
	});

	it("reports ambiguous and malformed legacy structures", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = MeetupEventMigration.migrateMeetupEventDto({
			repository: "cloud-native-aixmarseille/meetups",
			issueNumber: 14,
			issueTitle: "Legacy title",
			parsedBody: {
				hoster: ["First host", "Second host"],
				agenda: "not a valid agenda line",
				meetup_link: 123,
			},
		});

		// Assert
		expect(result.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: "event.hoster.multiple" }),
				expect.objectContaining({
					code: "event.agenda.legacy-line-invalid",
				}),
				expect.objectContaining({
					code: "event.document.invalid-field-type",
					field: "meetup_link",
				}),
			]),
		);
	});

	it("parses markdown and stable ID participant references", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const actual = MeetupEventMigration.parseParticipantReference(
			"[Ada Lovelace](https://example.com/speakers/ada)",
		);
		const actual1 = MeetupEventMigration.parseParticipantReference(
			"Grace Hopper\t[speaker-0002]",
		);

		// Assert
		expect(actual).toEqual({ displayName: "Ada Lovelace" });
		expect(actual1).toEqual({
			displayName: "Grace Hopper",
			id: "speaker-0002",
		});
	});
});
