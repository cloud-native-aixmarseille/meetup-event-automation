import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../testing/event.fixtures.js";
import {
	EXPECTED_POST_EVENT_TASK_NAMES,
	MeetupEventOperations,
} from "./model.js";
import { EventPatches } from "./patch.js";

describe("immutable event patches", () => {
	it("applies every supported field operation without changing the source", () => {
		// Arrange
		const source = createTestEvent();

		// Act
		const patch = EventPatches.createEventPatch([
			EventPatches.replaceEventField("issueTitle", "Projected title", "test"),
			EventPatches.replaceEventField("labels", ["meetup"], "test"),
			EventPatches.replaceEventField("eventTitle", "New event title", "test"),
			EventPatches.replaceEventField("date", "2026-10-01", "test"),
			EventPatches.replaceEventField("description", "New description", "test"),
			EventPatches.replaceEventField("host", undefined, "test"),
			EventPatches.replaceEventField("agenda", [], "test"),
			EventPatches.replaceEventField("publicationLinks", {}, "test"),
			EventPatches.replaceEventField("occurrenceStatus", "postponed", "test"),
			EventPatches.replaceEventField("timeZone", "UTC", "test"),
			EventPatches.replaceEventField(
				"confirmations",
				{ host: false, speakers: false },
				"test",
			),
			EventPatches.replaceEventField(
				"logistics",
				{ aperitif: "not-planned", postEventVenue: "planned" },
				"test",
			),
			EventPatches.replaceEventField(
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
			EventPatches.replaceEventField("followUpComplete", true, "test"),
		]);
		const result = EventPatches.applyEventPatch(source, patch);

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
		const patchedCompletion = EventPatches.applyEventPatch(
			source,
			EventPatches.createEventPatch([
				EventPatches.replaceEventField("followUpComplete", true, "test"),
			]),
		).followUpComplete;
		const clonedCompletion = MeetupEventOperations.cloneMeetupEvent({
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
		const result = EventPatches.applyEventPatch(
			source,
			EventPatches.createEventPatch([
				EventPatches.replaceEventField(
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
		const clone = MeetupEventOperations.cloneMeetupEvent(source);
		const merged = EventPatches.mergeEventPatches(
			EventPatches.createEventPatch([
				EventPatches.replaceEventField("eventTitle", "First", "first patch"),
			]),
			EventPatches.createEventPatch([
				EventPatches.replaceEventField("description", "Second", "second patch"),
			]),
		);
		const actual = EventPatches.applyEventPatch(source, merged);

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
