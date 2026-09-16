import { describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../testing/event.fixtures.js";
import {
	createClock,
	createCodec,
	document,
	identity,
} from "../../../testing/event-repository.fixtures.js";
import type { EventCommentRepository } from "../ports/event-comment-repository.js";
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
		const comments: EventCommentRepository = {
			reconcileDiagnostics: vi.fn(),
		};
		const useCase = new ReconcileEvent({
			repository,
			documentCodec: createCodec(new Map([[42, event]])),
			commentRepository: comments,
			clock: createClock(),
		});

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
		expect(comments.reconcileDiagnostics).not.toHaveBeenCalled();
	});

	it("persists a minimal projection and reconciles one managed comment in fix mode", async () => {
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
		const comments: EventCommentRepository = {
			reconcileDiagnostics: vi.fn().mockResolvedValue({ changed: true }),
		};
		const useCase = new ReconcileEvent({
			repository,
			documentCodec: createCodec(new Map([[42, event]])),
			commentRepository: comments,
			clock: createClock(),
		});

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
		expect(comments.reconcileDiagnostics).toHaveBeenCalledOnce();
		expect(result.persisted).toBe(true);
		expect(result.commentUpdated).toBe(true);
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
		const comments: EventCommentRepository = {
			reconcileDiagnostics: vi.fn().mockResolvedValue({ changed: false }),
		};
		const useCase = new ReconcileEvent({
			repository,
			documentCodec: createCodec(new Map([[42, event]])),
			commentRepository: comments,
			clock: createClock(),
		});

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
		const useCase = new ReconcileEvent({
			repository,
			documentCodec: createCodec(new Map([[42, event]])),
			commentRepository: { reconcileDiagnostics: vi.fn() },
			clock: createClock(),
		});

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
		const useCase = new ReconcileEvent({
			repository,
			documentCodec: createCodec(new Map()),
			commentRepository: { reconcileDiagnostics: vi.fn() },
			clock: createClock(),
		});

		// Act
		const operation = useCase.execute({ identity, mode: "check" });

		// Assert
		await expect(operation).rejects.toEqual(new EventNotFoundError(identity));
	});
});
