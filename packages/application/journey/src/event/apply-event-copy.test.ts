import { describe, expect, it, vi } from "vitest";
import { contentFixture } from "../../testing/promotional-content.fixtures.js";
import {
	event,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { ApplyEventCopy } from "./apply-event-copy.js";

describe("applying reviewed event copy", () => {
	it.each(["title", "description"] as const)(
		"updates %s through the event codec after checking concurrency",
		async (target) => {
			// Arrange
			const f = contentFixture(target);
			const repository = {
				find: vi.fn(),
				listPage: vi.fn(),
				applyPatch: vi.fn(),
			};
			const patch = { body: "Encoded issue" };
			const codec = { createPatch: vi.fn(() => patch) };
			const concurrency = {
				ensureEventDocumentIsCurrent: vi.fn(async () => undefined),
			};
			const apply = new ApplyEventCopy(repository, codec, concurrency);
			const context = {
				document: sourceDocument,
				event,
				plan: f.plan,
				destination: "Previous value",
			};
			// Act
			await apply.apply(context, "Approved copy");
			// Assert
			expect(concurrency.ensureEventDocumentIsCurrent).toHaveBeenCalledBefore(
				codec.createPatch,
			);
			expect(codec.createPatch).toHaveBeenCalledWith(
				sourceDocument,
				target === "title"
					? {
							...event,
							eventTitle: "Approved copy",
							issueTitle: `[Meetup] - ${event.date} - Approved copy`,
						}
					: { ...event, description: "Approved copy" },
			);
			expect(repository.applyPatch).toHaveBeenCalledWith(
				sourceDocument.identity,
				patch,
			);
		},
	);
	it("does not encode or write a concurrently changed issue", async () => {
		// Arrange
		const f = contentFixture();
		const repository = {
			find: vi.fn(),
			listPage: vi.fn(),
			applyPatch: vi.fn(),
		};
		const codec = { createPatch: vi.fn() };
		const concurrency = {
			ensureEventDocumentIsCurrent: vi
				.fn()
				.mockRejectedValue(new Error("Concurrent edit")),
		};
		const apply = new ApplyEventCopy(repository, codec, concurrency);
		// Act
		const result = await apply
			.apply(
				{
					document: sourceDocument,
					event,
					plan: f.plan,
					destination: "Previous value",
				},
				"Approved copy",
			)
			.catch((error) => error.message);
		// Assert
		expect(result).toBe("Concurrent edit");
		expect(codec.createPatch).not.toHaveBeenCalled();
		expect(repository.applyPatch).not.toHaveBeenCalled();
	});
});
