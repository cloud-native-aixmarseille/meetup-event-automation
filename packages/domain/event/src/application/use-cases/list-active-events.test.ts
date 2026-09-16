import { describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../testing/event.fixtures.js";
import {
	createClock,
	createCodec,
	document,
	identity,
} from "../../../testing/event-repository.fixtures.js";
import {
	EXPECTED_POST_EVENT_TASK_NAMES,
	type MeetupEvent,
} from "../../domain/model.js";
import type { EventRepository } from "../ports/event-repository.js";
import { EventPaginationError } from "./event-pagination-error.js";
import { ListActiveEvents } from "./list-active-events.js";

describe("ListActiveEvents", () => {
	it("paginates, deduplicates, and excludes terminal lifecycle states", async () => {
		// Arrange
		const activeDocument = {
			...document,
			identity: { ...identity, issueNumber: 1 },
		};
		const cancelledDocument = {
			...document,
			identity: { ...identity, issueNumber: 2 },
		};
		const completedDocument = {
			...document,
			identity: { ...identity, issueNumber: 3 },
		};
		const listPage = vi
			.fn()
			.mockResolvedValueOnce({
				items: [activeDocument, cancelledDocument],
				nextCursor: "page-2",
			})
			.mockResolvedValueOnce({
				items: [activeDocument, completedDocument],
			});
		const repository: EventRepository = {
			find: vi.fn(),
			applyPatch: vi.fn(),
			listPage,
		};
		const events = new Map<number, MeetupEvent>([
			[1, createTestEvent({ identity: activeDocument.identity })],
			[
				2,
				createTestEvent({
					identity: cancelledDocument.identity,
					occurrenceStatus: "cancelled",
				}),
			],
			[
				3,
				createTestEvent({
					identity: completedDocument.identity,
					occurrenceStatus: "held",
					operationalChecklists: {
						slidesAndContent: [],
						communication: [],
						postEvent: EXPECTED_POST_EVENT_TASK_NAMES.map((name) => ({
							name,
							completed: true,
						})),
					},
					followUpComplete: true,
				}),
			],
		]);
		const useCase = new ListActiveEvents({
			repository,
			documentCodec: createCodec(events),
			clock: createClock(),
		});

		// Act
		const result = await useCase.execute({
			repository: identity.repository,
			label: "meetup",
		});
		const actual = result.events.map((entry) => entry.identity.issueNumber);

		// Assert
		expect(listPage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ cursor: "page-2" }),
		);
		expect(actual).toEqual([1]);
	});

	it("rejects a repeated pagination cursor", async () => {
		// Arrange
		const repository: EventRepository = {
			find: vi.fn(),
			applyPatch: vi.fn(),
			listPage: vi
				.fn()
				.mockResolvedValue({ items: [], nextCursor: "same-page" }),
		};
		const useCase = new ListActiveEvents({
			repository,
			documentCodec: createCodec(new Map()),
			clock: createClock(),
		});

		// Act
		const operation = useCase.execute({ repository: identity.repository });

		// Assert
		await expect(operation).rejects.toEqual(
			new EventPaginationError("same-page"),
		);
	});
});
