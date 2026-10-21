import { describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../testing/event.fixtures.js";
import {
	createClock,
	createCodec,
	document,
	identity,
} from "../../../testing/event-repository.fixtures.js";
import { EventDomainComposition } from "../../dependency-composition.js";
import type {
	EventDocument,
	EventRepository,
} from "../ports/event-repository.js";
import { EventConcurrentModificationError } from "./event-concurrent-modification-error.js";
import { EventNotFoundError } from "./event-not-found-error.js";
import { ReconcileEvent } from "./reconcile-event.js";

describe("ReconcileEvent", () => {
	it("checks and proposes immutable patches without writing", async () => {
		// Arrange
		const event = createTestEvent({
			identity,
			issueTitle: document.issueTitle,
			labels: document.labels,
			eventTitle: " Cloud Native Evening ",
			occurrenceStatus: undefined,
		});
		const repository: EventRepository = {
			find: vi.fn().mockResolvedValue(document),
			applyPatch: vi.fn(),
			listPage: vi.fn(),
		};
		const useCase = new ReconcileEvent(
			{
				ruleEngine: new EventDomainComposition().eventRuleEngine(
					new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules(),
				),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
				eventRepositoryPatches:
					new EventDomainComposition().eventRepositoryPatches(),
			},
			{
				repository,
				documentCodec: createCodec(new Map([[42, event]])),
				clock: createClock(),
			},
		);

		// Act
		const result = await useCase.execute({ identity, mode: "check" });

		// Assert
		expect(result.event.eventTitle).toBe("Cloud Native Evening");
		expect(result.normalizationPatch.operations.length).toBeGreaterThan(0);
		expect(result.repositoryPatch.issueTitle).toBe(
			"[Meetup] - 2026-09-30 - Cloud Native Evening",
		);
		expect(result.persisted).toBe(false);
		expect(repository.applyPatch).not.toHaveBeenCalled();
	});

	it("persists a minimal issue projection in fix mode", async () => {
		// Arrange
		const event = createTestEvent({
			identity,
			issueTitle: document.issueTitle,
			labels: document.labels,
		});
		const repository: EventRepository = {
			find: vi.fn().mockResolvedValue(document),
			applyPatch: vi.fn().mockResolvedValue(undefined),
			listPage: vi.fn(),
		};
		const useCase = new ReconcileEvent(
			{
				ruleEngine: new EventDomainComposition().eventRuleEngine(
					new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules(),
				),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
				eventRepositoryPatches:
					new EventDomainComposition().eventRepositoryPatches(),
			},
			{
				repository,
				documentCodec: createCodec(new Map([[42, event]])),
				clock: createClock(),
			},
		);

		// Act
		const result = await useCase.execute({ identity, mode: "fix" });

		// Assert
		expect(repository.applyPatch).toHaveBeenCalledOnce();
		expect(repository.applyPatch).toHaveBeenCalledWith(
			identity,
			expect.objectContaining({
				issueTitle: "[Meetup] - 2026-09-30 - Cloud Native Evening",
			}),
		);
		expect(result.persisted).toBe(true);
	});

	it("does not write an empty repository patch", async () => {
		// Arrange
		const event = createTestEvent({ identity });
		const matchingDocument: EventDocument = {
			...document,
			issueTitle: event.issueTitle,
			labels: event.labels,
		};
		const repository: EventRepository = {
			find: vi.fn().mockResolvedValue(matchingDocument),
			applyPatch: vi.fn(),
			listPage: vi.fn(),
		};
		const useCase = new ReconcileEvent(
			{
				ruleEngine: new EventDomainComposition().eventRuleEngine(
					new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules(),
				),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
				eventRepositoryPatches:
					new EventDomainComposition().eventRepositoryPatches(),
			},
			{
				repository,
				documentCodec: createCodec(new Map([[42, event]])),
				clock: createClock(),
			},
		);

		// Act
		const result = await useCase.execute({ identity, mode: "fix" });

		// Assert
		expect(result.persisted).toBe(false);
		expect(repository.applyPatch).not.toHaveBeenCalled();
	});

	it("fails closed if the issue changes before a patch is persisted", async () => {
		// Arrange
		const event = createTestEvent({
			identity,
			issueTitle: document.issueTitle,
			labels: document.labels,
		});
		const repository: EventRepository = {
			find: vi
				.fn()
				.mockResolvedValueOnce(document)
				.mockResolvedValueOnce({ ...document, body: "concurrent edit" }),
			applyPatch: vi.fn(),
			listPage: vi.fn(),
		};
		const useCase = new ReconcileEvent(
			{
				ruleEngine: new EventDomainComposition().eventRuleEngine(
					new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules(),
				),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
				eventRepositoryPatches:
					new EventDomainComposition().eventRepositoryPatches(),
			},
			{
				repository,
				documentCodec: createCodec(new Map([[42, event]])),
				clock: createClock(),
			},
		);

		// Act
		const operation = useCase.execute({ identity, mode: "fix" });

		// Assert
		await expect(operation).rejects.toEqual(
			new EventConcurrentModificationError(identity),
		);
		expect(repository.applyPatch).not.toHaveBeenCalled();
	});

	it("fails explicitly when the event does not exist", async () => {
		// Arrange
		const repository: EventRepository = {
			find: vi.fn().mockResolvedValue(null),
			applyPatch: vi.fn(),
			listPage: vi.fn(),
		};
		const useCase = new ReconcileEvent(
			{
				ruleEngine: new EventDomainComposition().eventRuleEngine(
					new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules(),
				),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
				eventRepositoryPatches:
					new EventDomainComposition().eventRepositoryPatches(),
			},
			{
				repository,
				documentCodec: createCodec(new Map()),
				clock: createClock(),
			},
		);

		// Act
		const operation = useCase.execute({ identity, mode: "check" });

		// Assert
		await expect(operation).rejects.toEqual(new EventNotFoundError(identity));
	});
});
