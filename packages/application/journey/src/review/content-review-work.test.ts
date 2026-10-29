import { describe, expect, it, vi } from "vitest";
import { contentFixture } from "../../testing/promotional-content.fixtures.js";
import type { ContentSubmissions } from "../ports/content-submissions.js";
import { ContentReviewWork } from "./content-review-work.js";

function fixture() {
	const f = contentFixture();
	const submissions = {
		read: vi.fn<ContentSubmissions["read"]>().mockResolvedValue([]),
	};
	return {
		...f,
		submissions,
		work: new ContentReviewWork(f.store, submissions),
	};
}

describe("content review work", () => {
	it("reports no work only after reading both empty sources", async () => {
		// Arrange
		const f = fixture();
		f.store.load.mockResolvedValue({ revision: "empty", proposals: [] });
		// Act
		const result = await f.work.exists();
		// Assert
		expect(result).toBe(false);
		expect(f.store.load).toHaveBeenCalledOnce();
		expect(f.submissions.read).toHaveBeenCalledOnce();
		expect(f.store.save).not.toHaveBeenCalled();
	});
	it("keeps stored proposals eligible even without a completed draft", async () => {
		// Arrange
		const f = fixture();
		// Act
		const result = await f.work.exists();
		// Assert
		expect(result).toBe(true);
		expect(f.proposal.draft).toBeNull();
		expect(f.submissions.read).not.toHaveBeenCalled();
		expect(f.store.save).not.toHaveBeenCalled();
	});
	it("detects the first authenticated manual submission without stored proposals", async () => {
		// Arrange
		const f = fixture();
		f.store.load.mockResolvedValue({ revision: "empty", proposals: [] });
		f.submissions.read.mockResolvedValue([
			{
				id: "submission-one",
				actor: "organizer",
				target: "title",
				language: "fr",
				text: "A draft title",
				image: null,
			},
		]);
		// Act
		const result = await f.work.exists();
		// Assert
		expect(result).toBe(true);
		expect(f.store.save).not.toHaveBeenCalled();
	});
	it.each(["store", "submissions"] as const)(
		"propagates %s read failures instead of declaring no work",
		async (source) => {
			// Arrange
			const f = fixture();
			const error = new Error("Unverified content state");
			f.store.load.mockResolvedValue({ revision: "empty", proposals: [] });
			if (source === "store") f.store.load.mockRejectedValue(error);
			else f.submissions.read.mockRejectedValue(error);
			// Act
			const result = f.work.exists();
			// Assert
			await expect(result).rejects.toBe(error);
			expect(f.store.save).not.toHaveBeenCalled();
		},
	);
});
