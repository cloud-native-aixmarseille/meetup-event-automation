import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../testing/event.fixtures.js";
import { MeetupPublicationChecklist } from "./meetup-publication-checklist.js";

const task = { name: "Meetup event published", completed: true };

describe("Meetup publication checklist", () => {
	it.each([
		{ items: [], link: true, published: false },
		{ items: [{ ...task, completed: false }], link: true, published: false },
		{ items: [task], link: false, published: false },
		{ items: [task, task], link: true, published: false },
		{
			items: [task, { ...task, completed: false }],
			link: true,
			published: false,
		},
		{ items: [task], link: true, published: true },
	])(
		"requires one checked publication task and a link: %j",
		({ items, link, published }) => {
			// Arrange
			const source = createTestEvent();
			const event = {
				...source,
				publicationLinks: link ? source.publicationLinks : {},
				operationalChecklists: {
					...source.operationalChecklists,
					communication: items,
				},
			};

			// Act
			const actual = new MeetupPublicationChecklist().isPublished(event);

			// Assert
			expect(actual).toBe(published);
		},
	);

	it.each([[], [task], [task, task]])(
		"upserts verified status while preserving unrelated work: %j",
		(...items) => {
			// Arrange
			const source = createTestEvent();
			const other = { name: "Announcement", completed: true };
			const event = {
				...source,
				operationalChecklists: {
					...source.operationalChecklists,
					communication: [other, ...items],
				},
			};

			// Act
			const updated = new MeetupPublicationChecklist().withStatus(event, false);

			// Assert
			expect(updated.operationalChecklists.communication).toEqual([
				other,
				{ ...task, completed: false },
			]);
			expect(event.operationalChecklists.communication).toEqual([
				other,
				...items,
			]);
			expect(updated.operationalChecklists.slidesAndContent).toBe(
				event.operationalChecklists.slidesAndContent,
			);
		},
	);
});
