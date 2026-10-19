import { describe, expect, it, vi } from "vitest";
import {
	contentFixture,
	media,
} from "../../testing/promotional-content.fixtures.js";
import {
	event,
	identity,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { SubmitPromotionalContent } from "./submit-promotional-content.js";

describe("organizer content import", () => {
	it.each([true, false])(
		"recovers a reserved image by readback when present=%s",
		async (present) => {
			// Arrange
			const f = contentFixture("cover");
			const submission = {
				id: "submission:revision",
				actor: "organizer",
				target: "cover" as const,
				language: "fr" as const,
				text: "",
				image: { url: media.url, description: media.description },
			};
			const proposal = {
				...f.proposal,
				origin: {
					kind: "organizer" as const,
					login: submission.actor,
					submissionId: submission.id,
				},
				attempts: [{ id: media.id, phase: "reserved" as const }],
			};
			await f.store.save(await f.store.load(), [proposal]);
			f.images.read.mockResolvedValue(present ? media : undefined);
			const submissions = {
				read: vi.fn(async () => [submission]),
				verify: vi.fn(async () => true),
			};
			const loader = { load: vi.fn() };
			const useCase = new SubmitPromotionalContent(
				f.store,
				submissions,
				{
					read: vi.fn(async () => ({
						event,
						document: sourceDocument,
						plan: f.plan,
						destination: null,
					})),
				},
				f.factory,
				loader,
				f.images,
				f.fingerprints,
				f.policy,
			);
			// Act
			const diagnostics = await useCase.execute(identity);
			const stored = await f.store.load();
			// Assert
			expect(diagnostics).toEqual([]);
			expect(stored.proposals[0]?.draft).toEqual(
				present ? { text: "", media: [media] } : null,
			);
			expect(stored.proposals[0]?.decision).toBeNull();
			expect(f.images.persist).not.toHaveBeenCalled();
			expect(f.images.reserve).not.toHaveBeenCalled();
			expect(loader.load).not.toHaveBeenCalled();
		},
	);
	it("rejects invalid wording before reserving media or writing a proposal", async () => {
		// Arrange
		const f = contentFixture();
		const submission = {
			id: "submission:revision",
			actor: "organizer",
			target: "title" as const,
			language: "fr" as const,
			text: "Unfinished {title}",
			image: null,
		};
		const useCase = new SubmitPromotionalContent(
			f.store,
			{
				read: vi.fn(async () => [submission]),
				verify: vi.fn(async () => true),
			},
			{
				read: vi.fn(async () => ({
					event,
					document: sourceDocument,
					plan: f.plan,
					destination: null,
				})),
			},
			f.factory,
			{ load: vi.fn() },
			f.images,
			f.fingerprints,
			f.policy,
		);
		// Act
		const diagnostics = await useCase.execute(identity);
		// Assert
		expect(diagnostics).toEqual([
			expect.objectContaining({ code: "publication.content.prerequisites" }),
		]);
		expect(f.store.save).not.toHaveBeenCalled();
		expect(f.images.reserve).not.toHaveBeenCalled();
	});
});
