import { describe, expect, it, vi } from "vitest";
import { ScopedGithubLedgerCommentClient } from "./scoped-github-ledger-comment-client.js";

describe("ScopedGithubLedgerCommentClient", () => {
	it.each([
		null,
		{ id: "12", body: "managed" },
		{ id: 12, body: "managed", user: { login: 1 } },
	])(
		"does not hide malformed records while finding delivery state %#",
		async (value) => {
			// Arrange
			const issues = {
				listComments: vi.fn().mockResolvedValue({ data: [value], headers: {} }),
				createComment: vi.fn(),
				updateComment: vi.fn(),
			};
			const client = new ScopedGithubLedgerCommentClient(
				{ rest: { issues } },
				"example",
				"events",
				42,
			);

			// Act
			const operation = client.listComments();

			// Assert
			await expect(operation).rejects.toThrow(/comment/);
		},
	);

	it("bounds a provider pagination loop", async () => {
		// Arrange
		const issues = {
			listComments: vi.fn().mockResolvedValue({
				data: [],
				headers: { link: '<https://example.test/next>; rel="next"' },
			}),
			createComment: vi.fn(),
			updateComment: vi.fn(),
		};
		const client = new ScopedGithubLedgerCommentClient(
			{ rest: { issues } },
			"example",
			"events",
			42,
		);

		// Act
		const operation = client.listComments();

		// Assert
		await expect(operation).rejects.toThrow("pagination exceeded");
		expect(issues.listComments).toHaveBeenCalledTimes(100);
	});
});
