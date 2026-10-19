import { describe, expect, it, vi } from "vitest";
import {
	event,
	identity,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { contentFixture } from "../../testing/promotional-content.fixtures.js";
import type {
	ContentProposal,
	ContentTarget,
} from "../proposals/promotional-content.js";
import type { ApplyPromotionalContent } from "./apply-promotional-content.js";
import type { ContentReview } from "./content-review.js";
import type { ContentWorkspace } from "./content-workspace.js";
import { ManageContentReview } from "./manage-content-review.js";
import type { SubmitPromotionalContent } from "./submit-promotional-content.js";

function fixture(target: ContentTarget = "title") {
	const f = contentFixture(target);
	const proposal: ContentProposal = {
		...f.proposal,
		draft: { text: "A public draft", media: [] },
	};
	const snapshot = { revision: "snapshot-one", proposals: [proposal] };
	const store = { load: vi.fn(async () => snapshot), save: vi.fn() };
	const submissions = {
		execute: vi.fn<SubmitPromotionalContent["execute"]>().mockResolvedValue([]),
	};
	const workspace = {
		read: vi.fn<ContentWorkspace["read"]>().mockResolvedValue({
			document: sourceDocument,
			event,
			plan: f.plan,
			destination: "Previous title",
		}),
	};
	const review = {
		review: vi.fn<ContentReview["review"]>().mockResolvedValue("pending"),
	};
	const apply = {
		execute: vi
			.fn<ApplyPromotionalContent["execute"]>()
			.mockResolvedValue("accepted"),
	};
	const manager = new ManageContentReview(
		store,
		submissions,
		workspace,
		review,
		apply,
	);
	return {
		...f,
		proposal,
		snapshot,
		store,
		submissions,
		workspace,
		review,
		apply,
		manager,
	};
}

describe("content review coordination", () => {
	it.each(["accepted", "scheduled"] as const)(
		"keeps submission diagnostics after an approved draft is %s",
		async (status) => {
			// Arrange
			const f = fixture();
			const diagnostic = {
				code: "publication.content.recovery",
				severity: "warning" as const,
				message: "Submission needs recovery",
			};
			f.submissions.execute.mockResolvedValue([diagnostic]);
			f.review.review.mockResolvedValue("approved");
			f.apply.execute.mockResolvedValue(status);

			// Act
			const result = await f.manager.execute(identity);

			// Assert
			expect(result).toEqual([diagnostic]);
			expect(f.submissions.execute).toHaveBeenCalledExactlyOnceWith(identity);
			expect(f.workspace.read).toHaveBeenCalledExactlyOnceWith(
				identity,
				"title",
				"fr",
			);
			expect(f.review.review).toHaveBeenCalledExactlyOnceWith(
				f.proposal,
				f.plan,
			);
			expect(f.apply.execute).toHaveBeenCalledExactlyOnceWith(
				identity,
				f.proposal,
			);
		},
	);

	it.each([
		["title", "pending", "title"],
		["description", "rejected", "description"],
		["slack-aix:announcement", "stale", "assets"],
		["cover", "iteration-requested", "assets"],
	] as const)(
		"reports %s review status %s without applying content",
		async (target, status, field) => {
			// Arrange
			const f = fixture(target);
			f.review.review.mockResolvedValue(status);

			// Act
			const result = await f.manager.execute(identity);

			// Assert
			expect(result).toEqual([
				{
					code: `publication.content.${status}`,
					severity: "warning",
					field,
					message: `Content ${target}: ${status}`,
				},
			]);
			expect(f.apply.execute).not.toHaveBeenCalled();
		},
	);

	it.each(["pending", "stale"] as const)(
		"reports approval application blocked by %s",
		async (status) => {
			// Arrange
			const f = fixture();
			f.review.review.mockResolvedValue("approved");
			f.apply.execute.mockResolvedValue(status);

			// Act
			const result = await f.manager.execute(identity);

			// Assert
			expect(result).toEqual([
				expect.objectContaining({
					code: `publication.content.${status}`,
					severity: "warning",
					field: "title",
				}),
			]);
		},
	);

	it("reports an ineligible source without reviewing or applying it", async () => {
		// Arrange
		const f = fixture();
		f.workspace.read.mockResolvedValue(undefined);

		// Act
		const result = await f.manager.execute(identity);

		// Assert
		expect(result).toEqual([
			{
				code: "publication.content.stale",
				severity: "warning",
				field: "assets",
				message: "Content source is no longer eligible",
			},
		]);
		expect(f.review.review).not.toHaveBeenCalled();
		expect(f.apply.execute).not.toHaveBeenCalled();
	});

	it("requests recovery for an unfinished generation without requesting approval", async () => {
		// Arrange
		const f = fixture();
		f.store.load.mockResolvedValue({
			revision: "snapshot-two",
			proposals: [{ ...f.proposal, draft: null }],
		});

		// Act
		const result = await f.manager.execute(identity);

		// Assert
		expect(result).toEqual([
			expect.objectContaining({
				code: "publication.content.recovery",
				field: "title",
			}),
		]);
		expect(f.review.review).not.toHaveBeenCalled();
		expect(f.apply.execute).not.toHaveBeenCalled();
	});

	it("reviews only the latest submitted proposal for each target", async () => {
		// Arrange
		const f = fixture();
		const description = {
			...f.proposal,
			id: "description",
			plan: contentFixture("description").plan,
		};
		const latest = { ...f.proposal, id: "latest-title" };
		f.snapshot.proposals.push(description);
		f.submissions.execute.mockImplementation(async () => {
			f.snapshot.proposals.push(latest);
			return [];
		});

		// Act
		await f.manager.execute(identity);

		// Assert
		expect(f.review.review).toHaveBeenCalledTimes(2);
		expect(f.review.review.mock.calls.map(([proposal]) => proposal.id)).toEqual(
			[latest.id, description.id],
		);
		expect(f.workspace.read).toHaveBeenCalledWith(
			identity,
			"description",
			"fr",
		);
	});

	it("propagates submission failures before loading stored drafts", async () => {
		// Arrange
		const f = fixture();
		const error = new Error("Submission service unavailable");
		f.submissions.execute.mockRejectedValue(error);

		// Act
		const result = f.manager.execute(identity);

		// Assert
		await expect(result).rejects.toBe(error);
		expect(f.store.load).not.toHaveBeenCalled();
		expect(f.apply.execute).not.toHaveBeenCalled();
	});
});
