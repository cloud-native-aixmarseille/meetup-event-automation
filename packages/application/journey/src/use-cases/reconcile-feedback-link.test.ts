import {
	type EventDocument,
	EventDomainComposition,
} from "@meetup-automation/event";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import {
	createEventDependencies,
	event,
	identity,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { ReconcileFeedbackLink } from "./reconcile-feedback-link.js";

function fixture() {
	const dependencies = createEventDependencies();
	let documents: EventDocument[] = [sourceDocument];
	vi.mocked(dependencies.repository.listPage).mockImplementation(async () => ({
		items: documents,
	}));
	vi.mocked(dependencies.repository.find).mockImplementation(
		async (requested) =>
			documents.find(
				(item) => item.identity.issueNumber === requested.issueNumber,
			) ?? null,
	);
	vi.mocked(dependencies.documentCodec.decode).mockImplementation(
		(document) => ({
			event: {
				...event,
				...document,
				date:
					document.identity.issueNumber === 42 ? "2026-09-30" : "2026-09-29",
				publicationLinks: {
					feedback: `https://openfeedback.io/event-${document.identity.issueNumber}`,
				},
			},
			diagnostics: [],
		}),
	);
	const links = { updateTarget: vi.fn().mockResolvedValue(true) };
	const clock = { now: vi.fn().mockReturnValue("2026-09-29T10:00:00Z") };
	const publication = new PublicationDomainComposition();
	const operation = new ReconcileFeedbackLink({
		events: dependencies.repository,
		codec: dependencies.documentCodec,
		clock,
		concurrency: new EventDomainComposition().eventDocumentConcurrency(),
		selection: publication.feedbackLinkSelection(),
		policy: publication.feedbackPolicy(),
		links,
		label: "meetup",
		timeZone: "Europe/Paris",
	});
	return {
		dependencies,
		links,
		clock,
		operation,
		setDocuments: (value: EventDocument[]) => {
			documents = value;
		},
	};
}

describe("ReconcileFeedbackLink", () => {
	it("selects today's event ahead of tomorrow regardless of listing order", async () => {
		// Arrange
		const { operation, links, setDocuments } = fixture();
		setDocuments([
			sourceDocument,
			{ ...sourceDocument, identity: { ...identity, issueNumber: 99 } },
		]);
		// Act
		const result = await operation.execute(identity.repository);
		// Assert
		expect(result.updated).toBe(true);
		expect(links.updateTarget).toHaveBeenCalledExactlyOnceWith(
			"https://openfeedback.io/event-99",
		);
	});
	it("preserves the shared link when the selected event has no valid feedback URL", async () => {
		// Arrange
		const { dependencies, operation, links } = fixture();
		vi.mocked(dependencies.documentCodec.decode).mockReturnValue({
			event: { ...event, publicationLinks: {} },
			diagnostics: [],
		});
		// Act
		const result = await operation.execute(identity.repository);
		// Assert
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "publication.feedback-link.prerequisites",
			}),
		);
		expect(links.updateTarget).not.toHaveBeenCalled();
	});
	it("blocks ambiguous dates found on a later page", async () => {
		// Arrange
		const { dependencies, operation, links } = fixture();
		vi.mocked(dependencies.repository.listPage)
			.mockResolvedValueOnce({ items: [sourceDocument], nextCursor: "next" })
			.mockResolvedValueOnce({
				items: [
					{ ...sourceDocument, identity: { ...identity, issueNumber: 99 } },
				],
			});
		vi.mocked(dependencies.documentCodec.decode).mockReturnValue({
			event,
			diagnostics: [],
		});
		// Act
		const result = await operation.execute(identity.repository);
		// Assert
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "publication.feedback-link.ambiguous-date",
			}),
		);
		expect(links.updateTarget).not.toHaveBeenCalled();
	});
	it.each(["repeated", "unbounded"])(
		"fails closed on %s pagination",
		async (failure) => {
			// Arrange
			const { dependencies, operation, links } = fixture();
			vi.mocked(dependencies.repository.listPage).mockImplementation(
				async ({ cursor }) => ({
					items: [],
					nextCursor:
						failure === "repeated" ? "same" : String(Number(cursor ?? "0") + 1),
				}),
			);
			// Act
			const result = operation.execute(identity.repository);
			// Assert
			await expect(result).rejects.toMatchObject({
				name: "EventPaginationError",
			});
			expect(links.updateTarget).not.toHaveBeenCalled();
		},
	);
	it.each(["2026-09-28T10:00:00Z", "2026-10-01T10:00:00Z"])(
		"leaves the link unchanged outside the update window at %s",
		async (now) => {
			// Arrange
			const { operation, links, clock } = fixture();
			clock.now.mockReturnValue(now);
			// Act
			const result = await operation.execute(identity.repository);
			// Assert
			expect(result.updated).toBe(false);
			expect(links.updateTarget).not.toHaveBeenCalled();
		},
	);
	it("rejects human edits before switching the destination", async () => {
		// Arrange
		const { dependencies, operation, links } = fixture();
		vi.mocked(dependencies.repository.find).mockResolvedValue({
			...sourceDocument,
			body: "human edit",
		});
		// Act
		const result = operation.execute(identity.repository);
		// Assert
		await expect(result).rejects.toMatchObject({
			name: "EventConcurrentModificationError",
		});
		expect(links.updateTarget).not.toHaveBeenCalled();
	});
	it("rejects a changed candidate set", async () => {
		// Arrange
		const { dependencies, operation, links } = fixture();
		vi.mocked(dependencies.repository.listPage)
			.mockResolvedValueOnce({ items: [sourceDocument] })
			.mockResolvedValueOnce({ items: [] });
		// Act
		const result = operation.execute(identity.repository);
		// Assert
		await expect(result).rejects.toThrow("candidates changed");
		expect(links.updateTarget).not.toHaveBeenCalled();
	});
	it("propagates provider failures without changing event issues", async () => {
		// Arrange
		const { dependencies, operation, links } = fixture();
		links.updateTarget.mockRejectedValue(new Error("Provider unavailable"));
		// Act
		const result = operation.execute(identity.repository);
		// Assert
		await expect(result).rejects.toThrow("Provider unavailable");
		expect(dependencies.repository.applyPatch).not.toHaveBeenCalled();
	});
});
