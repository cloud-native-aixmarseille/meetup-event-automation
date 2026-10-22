import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { EventDomainComposition } from "@meetup-automation/event";
import { describe, expect, it, vi } from "vitest";
import {
	createEventDependencies,
	event,
	identity,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { ReconcileMeetupSlidesPdf } from "./reconcile-meetup-slides-pdf.js";

function fixture() {
	const dependencies = createEventDependencies();
	const revision = { of: vi.fn().mockReturnValue("revision") };
	const pdf = {
		execute: vi
			.fn()
			.mockResolvedValue({ status: "ready", updated: false, diagnostics: [] }),
	};
	const clock = { now: vi.fn().mockReturnValue("2026-10-01T12:00:00Z") };
	const source = {
		revision: "revision",
		container: {
			id: "folder",
			url: "https://example.test/folder",
			name: "Event",
			eventId: `${identity.repository}#${identity.issueNumber}`,
		},
		presentation: { id: "slides", name: "Slides", templateId: "template" },
	};
	const operation = new ReconcileMeetupSlidesPdf({
		events: dependencies.repository,
		codec: dependencies.documentCodec,
		clock,
		revision,
		concurrency: new EventDomainComposition().eventDocumentConcurrency(),
		postEvent: new CommunicationDomainComposition().postEventPolicy(),
		pdf,
	});
	return { dependencies, revision, pdf, clock, source, operation };
}

describe("ReconcileMeetupSlidesPdf", () => {
	it.each([
		["scheduled", "2026-09-30T21:59:59Z", false],
		["scheduled", "2026-09-30T22:00:00Z", true],
		["held", "2026-09-29T12:00:00Z", true],
		["postponed", "2026-10-01T12:00:00Z", false],
		[undefined, "2026-10-01T12:00:00Z", false],
	] as const)(
		"uses occurrence %s and local date at %s for PDF eligibility",
		async (occurrenceStatus, now, eligible) => {
			// Arrange
			const { dependencies, clock, source, operation, pdf } = fixture();
			clock.now.mockReturnValue(now);
			vi.mocked(dependencies.documentCodec.decode).mockReturnValue({
				event: { ...event, occurrenceStatus },
				diagnostics: [],
			});
			// Act
			await operation.execute(identity, source, true);
			// Assert
			expect(pdf.execute).toHaveBeenCalledWith({
				eligible,
				sourceReady: true,
				date: event.date,
				container: source.container,
				source: source.presentation,
			});
		},
	);
	it("rejects an issue edited after document preparation", async () => {
		// Arrange
		const { revision, source, operation, pdf } = fixture();
		revision.of.mockReturnValue("changed-revision");
		// Act
		const result = operation.execute(identity, source, true);
		// Assert
		await expect(result).rejects.toMatchObject({
			name: "EventConcurrentModificationError",
		});
		expect(pdf.execute).not.toHaveBeenCalled();
	});
	it("rejects an issue edited while preparing the export", async () => {
		// Arrange
		const { dependencies, source, operation, pdf } = fixture();
		vi.mocked(dependencies.repository.find)
			.mockResolvedValueOnce(sourceDocument)
			.mockResolvedValue({ ...sourceDocument, body: "human edit" });
		// Act
		const result = operation.execute(identity, source, true);
		// Assert
		await expect(result).rejects.toMatchObject({
			name: "EventConcurrentModificationError",
		});
		expect(pdf.execute).not.toHaveBeenCalled();
	});
	it("rejects a prepared source belonging to another event", async () => {
		// Arrange
		const { source, operation, pdf } = fixture();
		source.container.eventId = "other/repository#99";
		// Act
		const result = operation.execute(identity, source, true);
		// Assert
		await expect(result).rejects.toThrow("another event");
		expect(pdf.execute).not.toHaveBeenCalled();
	});
	it("reports unready slides to the export policy", async () => {
		// Arrange
		const { source, operation, pdf } = fixture();
		// Act
		await operation.execute(identity, source, false);
		// Assert
		expect(pdf.execute).toHaveBeenCalledWith(
			expect.objectContaining({ sourceReady: false }),
		);
	});
	it("skips events without a completed document preparation", async () => {
		// Arrange
		const { operation, pdf } = fixture();
		// Act
		const result = await operation.execute(identity, {}, false);
		// Assert
		expect(result.status).toBe("not-applicable");
		expect(pdf.execute).not.toHaveBeenCalled();
	});
	it("propagates a technical export failure without modifying the event", async () => {
		// Arrange
		const { dependencies, source, operation, pdf } = fixture();
		pdf.execute.mockRejectedValue(new Error("Export transport failed"));
		// Act
		const result = operation.execute(identity, source, true);
		// Assert
		await expect(result).rejects.toThrow("Export transport failed");
		expect(dependencies.repository.applyPatch).not.toHaveBeenCalled();
	});
});
