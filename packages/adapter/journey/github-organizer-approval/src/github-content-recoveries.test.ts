import { describe, expect, it } from "vitest";
import { contentStoreFixture } from "../testing/content-store.fixtures.js";
import { GithubContentRecoveries } from "./github-content-recoveries.js";

describe("explicit recovery authority", () => {
	it.each(["write", "read"])(
		"requires current %s permission on a human recovery request",
		async (permission) => {
			// Arrange
			const f = contentStoreFixture();
			const body =
				'<!-- meetup-content-recovery:v1 -->\n{"proposalId":"content-00000000-0000-4000-8000-000000000001","guidance":"A fresh scene"}';
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
			const reader = new GithubContentRecoveries(
				f.client,
				f.values,
				f.fingerprints,
			);
			// Act
			const requests = await reader.read();
			// Assert
			expect(requests).toHaveLength(permission === "write" ? 1 : 0);
			if (permission === "write")
				expect(requests[0]).toMatchObject({
					actor: "organizer",
					guidance: "A fresh scene",
				});
		},
	);
});
