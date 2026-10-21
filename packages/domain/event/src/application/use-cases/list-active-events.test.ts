import { describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../testing/event.fixtures.js";
import {
	createClock,
	createCodec,
	document,
	identity,
} from "../../../testing/event-repository.fixtures.js";
import { EventDomainComposition } from "../../dependency-composition.js";
import {
	EXPECTED_POST_EVENT_TASK_NAMES,
	type MeetupEvent,
} from "../../domain/model.js";
import type { EventRepository } from "../ports/event-repository.js";
import { EventPaginationError } from "./event-pagination-error.js";
import { ListActiveEvents } from "./list-active-events.js";

describe("ListActiveEvents", () => {
	it("paginates and deduplicates open issues regardless of occurrence status", async () => {
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
		const useCase = new ListActiveEvents(
			{
				ruleEngine: new EventDomainComposition().eventRuleEngine(
					new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules(),
				),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
			},
			{
				repository,
				documentCodec: createCodec(events),
				clock: createClock(),
			},
		);

		// Act
		const result = await useCase.execute({
			repository: identity.repository,
			label: "meetup",
		});
		const actual = result.events.map((entry) => entry.identity.issueNumber);

		// Assert
		expect(listPage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ cursor: "page-2", includeClosed: false }),
		);
		expect(actual).toEqual([1, 2, 3]);
	});

	it("excludes closed documents before parsing or evaluating their forms", async () => {
		// Arrange
		const closedDocument = {
			...document,
			issueState: "closed" as const,
			body: "Archived event",
		};
		const repository: EventRepository = {
			find: vi.fn(),
			applyPatch: vi.fn(),
			listPage: vi.fn().mockResolvedValue({ items: [closedDocument] }),
		};
		const codec = createCodec(new Map());
		const decode = vi.spyOn(codec, "decode");
		const useCase = new ListActiveEvents(
			{
				ruleEngine: new EventDomainComposition().eventRuleEngine(
					new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules(),
				),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
			},
			{
				repository,
				documentCodec: codec,
				clock: createClock(),
			},
		);

		// Act
		const result = await useCase.execute({ repository: identity.repository });

		// Assert
		expect(result).toEqual({ events: [], diagnostics: [] });
		expect(decode).not.toHaveBeenCalled();
		expect(repository.listPage).toHaveBeenCalledWith(
			expect.objectContaining({ includeClosed: false }),
		);
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
		const useCase = new ListActiveEvents(
			{
				ruleEngine: new EventDomainComposition().eventRuleEngine(
					new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules(),
				),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
			},
			{
				repository,
				documentCodec: createCodec(new Map()),
				clock: createClock(),
			},
		);

		// Act
		const operation = useCase.execute({ repository: identity.repository });

		// Assert
		await expect(operation).rejects.toEqual(
			new EventPaginationError("same-page"),
		);
	});
	it("fails explicitly when the bounded audit selection is exceeded", async () => {
		// Arrange
		const items = Array.from({ length: 201 }, (_, index) => ({
			...document,
			identity: { ...identity, issueNumber: index + 1 },
		}));
		const events = new Map(
			items.map((item) => [
				item.identity.issueNumber,
				createTestEvent({ identity: item.identity }),
			]),
		);
		const repository: EventRepository = {
			find: vi.fn(),
			applyPatch: vi.fn(),
			listPage: vi.fn().mockResolvedValue({ items }),
		};
		const useCase = new ListActiveEvents(
			{
				ruleEngine: new EventDomainComposition().eventRuleEngine(
					new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules(),
				),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
			},
			{
				repository,
				documentCodec: createCodec(events),
				clock: createClock(),
			},
		);

		// Act
		const operation = useCase.execute({ repository: identity.repository });

		// Assert
		await expect(operation).rejects.toThrow("audit-issue-limit");
	});
});
