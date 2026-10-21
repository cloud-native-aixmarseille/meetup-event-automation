import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../testing/event.fixtures.js";
import { EventDomainComposition } from "../dependency-composition.js";
import { EXPECTED_POST_EVENT_TASK_NAMES } from "./model.js";
import { EventPatches } from "./patch.js";

describe("immutable event patches", () => {
	it("applies every supported field operation without changing the source", () => {
		// Arrange
		const source = createTestEvent();

		// Act
		const patch = new EventPatches({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).createEventPatch([
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("issueTitle", "Projected title", "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("labels", ["meetup"], "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("eventTitle", "New event title", "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("date", "2026-10-01", "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("description", "New description", "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("host", undefined, "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("agenda", [], "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("publicationLinks", {}, "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("occurrenceStatus", "postponed", "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("timeZone", "UTC", "test"),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField(
				"confirmations",
				{ host: false, speakers: false },
				"test",
			),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField(
				"logistics",
				{ aperitif: "not-planned", postEventVenue: "planned" },
				"test",
			),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField(
				"operationalChecklists",
				{
					slidesAndContent: [{ name: "Basic Slides", completed: true }],
					communication: [{ name: "Announcement", completed: true }],
					postEvent: EXPECTED_POST_EVENT_TASK_NAMES.map((name) => ({
						name,
						completed: true,
					})),
				},
				"test",
			),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).replaceEventField("followUpComplete", true, "test"),
		]);
		const result = new EventPatches({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).applyEventPatch(source, patch);

		// Assert
		expect(result).toMatchObject({
			issueTitle: "Projected title",
			labels: ["meetup"],
			eventTitle: "New event title",
			date: "2026-10-01",
			description: "New description",
			host: undefined,
			agenda: [],
			publicationLinks: {},
			occurrenceStatus: "postponed",
			timeZone: "UTC",
			confirmations: { host: false, speakers: false },
			logistics: { aperitif: "not-planned", postEventVenue: "planned" },
			operationalChecklists: {
				slidesAndContent: [{ name: "Basic Slides", completed: true }],
				communication: [{ name: "Announcement", completed: true }],
				postEvent: EXPECTED_POST_EVENT_TASK_NAMES.map((name) => ({
					name,
					completed: true,
				})),
			},
			followUpComplete: true,
		});
		expect(source.issueTitle).not.toBe(result.issueTitle);
		expect(source.host).toBeDefined();
	});

	it("does not apply a completion flag without exact named task evidence", () => {
		// Arrange
		const source = createTestEvent({
			operationalChecklists: {
				slidesAndContent: [],
				communication: [],
				postEvent: [{ name: "Mail thanks hoster", completed: true }],
			},
		});

		// Act
		const patchedCompletion = new EventPatches({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).applyEventPatch(
			source,
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).createEventPatch([
				new EventPatches({
					meetupEventOperations:
						new EventDomainComposition().meetupEventOperations(),
				}).replaceEventField("followUpComplete", true, "test"),
			]),
		).followUpComplete;
		const clonedCompletion = new EventDomainComposition()
			.meetupEventOperations()
			.cloneMeetupEvent({
				...source,
				followUpComplete: true,
			}).followUpComplete;

		// Assert
		expect(patchedCompletion).toBe(false);
		expect(clonedCompletion).toBe(false);
	});

	it("invalidates completion when the named checklist becomes incomplete", () => {
		// Arrange
		const source = createTestEvent({
			followUpComplete: true,
			operationalChecklists: {
				slidesAndContent: [],
				communication: [],
				postEvent: EXPECTED_POST_EVENT_TASK_NAMES.map((name) => ({
					name,
					completed: true,
				})),
			},
		});

		// Act
		const result = new EventPatches({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).applyEventPatch(
			source,
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).createEventPatch([
				new EventPatches({
					meetupEventOperations:
						new EventDomainComposition().meetupEventOperations(),
				}).replaceEventField(
					"operationalChecklists",
					{
						...source.operationalChecklists,
						postEvent: source.operationalChecklists.postEvent.slice(0, 4),
					},
					"test",
				),
			]),
		);

		// Assert
		expect(result.followUpComplete).toBe(false);
	});

	it("clones nested event data and merges operation lists", () => {
		// Arrange
		const source = createTestEvent();

		// Act
		const clone = new EventDomainComposition()
			.meetupEventOperations()
			.cloneMeetupEvent(source);
		const merged = new EventPatches({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).mergeEventPatches(
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).createEventPatch([
				new EventPatches({
					meetupEventOperations:
						new EventDomainComposition().meetupEventOperations(),
				}).replaceEventField("eventTitle", "First", "first patch"),
			]),
			new EventPatches({
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
			}).createEventPatch([
				new EventPatches({
					meetupEventOperations:
						new EventDomainComposition().meetupEventOperations(),
				}).replaceEventField("description", "Second", "second patch"),
			]),
		);
		const actual = new EventPatches({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).applyEventPatch(source, merged);

		// Assert
		expect(clone).toEqual(source);
		expect(clone).not.toBe(source);
		expect(clone.agenda).not.toBe(source.agenda);
		expect(clone.logistics).not.toBe(source.logistics);
		expect(clone.operationalChecklists).not.toBe(source.operationalChecklists);
		expect(clone.operationalChecklists.postEvent).not.toBe(
			source.operationalChecklists.postEvent,
		);
		expect(actual).toMatchObject({
			eventTitle: "First",
			description: "Second",
		});
	});
});
