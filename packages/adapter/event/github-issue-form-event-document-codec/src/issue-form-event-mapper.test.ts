import { EventDomainComposition } from "@meetup-automation/event";
import { describe, expect, it } from "vitest";
import { GithubIssueFormEventDocumentCodecComposition } from "./dependency-composition.js";
import { IssueFormEventMapper } from "./issue-form-event-mapper.js";

describe("issue form event mapping", () => {
	it("maps participant fields without retaining presentation URLs", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = new IssueFormEventMapper({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			issueFormFields:
				new GithubIssueFormEventDocumentCodecComposition().issueFormFields(),
			eventOccurrenceParser:
				new EventDomainComposition().eventOccurrenceParser(),
		}).map({
			repository: "example/meetups",
			issueNumber: 12,
			issueTitle: "Example title",
			labels: ["meetup", "hoster:confirmed"],
			parsedBody: {
				event_date: "2026-11-05",
				event_title: "Example event",
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
			confirmations: { speakers: false },
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

	it("reports invalid field types instead of throwing", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = new IssueFormEventMapper({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			issueFormFields:
				new GithubIssueFormEventDocumentCodecComposition().issueFormFields(),
			eventOccurrenceParser:
				new EventDomainComposition().eventOccurrenceParser(),
		}).map({
			repository: "example/meetups",
			issueNumber: 13,
			issueTitle: "Example title",
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
			const result = new IssueFormEventMapper({
				eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
				issueFormFields:
					new GithubIssueFormEventDocumentCodecComposition().issueFormFields(),
				eventOccurrenceParser:
					new EventDomainComposition().eventOccurrenceParser(),
			}).map(source);

			// Assert
			expect(result.event.occurrenceStatus).toBe(status);
		},
	);

	it("treats a closed issue as held when no explicit occurrence label is present", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = new IssueFormEventMapper({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			issueFormFields:
				new GithubIssueFormEventDocumentCodecComposition().issueFormFields(),
			eventOccurrenceParser:
				new EventDomainComposition().eventOccurrenceParser(),
		}).map({
			repository: "example/meetups",
			issueNumber: 17,
			issueTitle: "Example title",
			issueState: "closed",
			labels: ["meetup"],
			parsedBody: {},
		});

		// Assert
		expect(result.event.occurrenceStatus).toBe("held");
	});

	it("reports ambiguous and malformed form structures", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = new IssueFormEventMapper({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			issueFormFields:
				new GithubIssueFormEventDocumentCodecComposition().issueFormFields(),
			eventOccurrenceParser:
				new EventDomainComposition().eventOccurrenceParser(),
		}).map({
			repository: "example/meetups",
			issueNumber: 14,
			issueTitle: "Example title",
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
});
