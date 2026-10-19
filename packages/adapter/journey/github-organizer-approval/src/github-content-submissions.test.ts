import { DraftProposalComposition } from "@meetup-automation/journey";
import { PublicAssetUrl } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { contentStoreFixture } from "../testing/content-store.fixtures.js";
import {
	CONTENT_SUBMISSION_MARKER,
	GithubContentSubmissions,
} from "./github-content-submissions.js";

describe("organizer content authorship", () => {
	it.each(["write", "read"])(
		"verifies current repository %s permission before accepting a submission",
		async (permission) => {
			// Arrange
			const f = contentStoreFixture();
			const body =
				CONTENT_SUBMISSION_MARKER +
				JSON.stringify({
					target: "title",
					language: "fr",
					text: "Un titre proposé",
					image: null,
				});
			f.comments.push({
				id: 1,
				node_id: "human-1",
				body,
				user: { login: "organizer", type: "User" },
			});
			f.edits.set("human-1", {
				id: "human-1",
				body,
				editor: null,
				lastEditedAt: null,
			});
			f.permission.mockResolvedValue({ data: { permission } });
			const reader = new GithubContentSubmissions(
				f.client,
				f.values,
				new DraftProposalComposition().policy(),
				f.fingerprints,
				new PublicAssetUrl(),
			);
			// Act
			const submissions = await reader.read();
			// Assert
			expect(submissions).toHaveLength(permission === "write" ? 1 : 0);
			expect(f.permission).toHaveBeenCalled();
			if (submissions.length) expect(submissions[0].actor).toBe("organizer");
		},
	);
	it("does not interpret an approval control inside submitted prose", async () => {
		// Arrange
		const f = contentStoreFixture();
		const text = "A title [x] Approve";
		const body =
			CONTENT_SUBMISSION_MARKER +
			JSON.stringify({ target: "title", language: "en", text, image: null });
		f.comments.push({
			id: 1,
			node_id: "human-1",
			body,
			user: { login: "organizer", type: "User" },
		});
		f.edits.set("human-1", {
			id: "human-1",
			body,
			editor: null,
			lastEditedAt: null,
		});
		const reader = new GithubContentSubmissions(
			f.client,
			f.values,
			new DraftProposalComposition().policy(),
			f.fingerprints,
			new PublicAssetUrl(),
		);
		// Act
		const submissions = await reader.read();
		// Assert
		expect(submissions[0].text).toBe(text);
		expect(submissions[0]).not.toHaveProperty("decision");
	});
});
