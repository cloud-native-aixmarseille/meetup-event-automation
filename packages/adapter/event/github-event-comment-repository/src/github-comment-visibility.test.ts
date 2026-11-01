import { describe, expect, it, vi } from "vitest";
import { GitHubCommentVisibility } from "./github-comment-visibility.js";

function fixture(isMinimized = false, minimizedReason: string | null = null) {
	const getComment = vi.fn().mockResolvedValue({
		data: { node_id: "node-42", body: "Verified decision" },
	});
	const graphql = vi.fn().mockResolvedValueOnce({
		node: {
			id: "node-42",
			body: "Verified decision",
			isMinimized,
			minimizedReason,
		},
	});
	const visibility = new GitHubCommentVisibility(
		{ graphql, rest: { issues: { getComment } } },
		"example",
		"meetups",
	);
	return { visibility, graphql, getComment };
}

describe("GitHub comment visibility", () => {
	it("hides a completed comment as resolved without editing its body", async () => {
		// Arrange
		const f = fixture();
		f.graphql.mockResolvedValueOnce({
			minimizeComment: { minimizedComment: { isMinimized: true } },
		});

		// Act
		await f.visibility.synchronize(42, "Verified decision", true);

		// Assert
		expect(f.getComment).toHaveBeenCalledWith({
			owner: "example",
			repo: "meetups",
			comment_id: 42,
		});
		expect(f.graphql).toHaveBeenLastCalledWith(
			expect.stringContaining("classifier: RESOLVED"),
			{ id: "node-42" },
		);
	});
	it("restores a resolved comment when new work is pending", async () => {
		// Arrange
		const f = fixture(true, "resolved");
		f.graphql.mockResolvedValueOnce({
			unminimizeComment: { unminimizedComment: { isMinimized: false } },
		});

		// Act
		await f.visibility.synchronize(42, "Verified decision", false);

		// Assert
		expect(f.graphql).toHaveBeenLastCalledWith(
			expect.stringContaining("unminimizeComment(input:"),
			{ id: "node-42" },
		);
	});
	it.each([
		[true, "resolved", true],
		[false, null, false],
		[true, "spam", false],
	])(
		"preserves an already suitable or moderated state (%s, %s, %s)",
		async (minimized, reason, resolved) => {
			// Arrange
			const f = fixture(minimized, reason);

			// Act
			await f.visibility.synchronize(42, "Verified decision", resolved);

			// Assert
			expect(f.graphql).toHaveBeenCalledTimes(1);
		},
	);
	it("rejects a concurrent edit before reading visibility", async () => {
		// Arrange
		const f = fixture();
		f.getComment.mockResolvedValue({
			data: { node_id: "node-42", body: "New request" },
		});

		// Act
		const update = f.visibility.synchronize(42, "Verified decision", true);

		// Assert
		await expect(update).rejects.toThrow("changed before visibility update");
		expect(f.graphql).not.toHaveBeenCalled();
	});
	it.each([
		{ node: null },
		{
			node: { id: "different", body: "Verified decision", isMinimized: false },
		},
		{ node: { id: "node-42", body: "Changed", isMinimized: false } },
		{ node: { id: "node-42", body: "Verified decision" } },
	])("refuses unverified GraphQL comment state %#", async (response) => {
		// Arrange
		const f = fixture();
		f.graphql.mockReset().mockResolvedValue(response);

		// Act
		const update = f.visibility.synchronize(42, "Verified decision", true);

		// Assert
		await expect(update).rejects.toThrow();
		expect(f.graphql).toHaveBeenCalledTimes(1);
	});
	it.each([
		{},
		{ minimizeComment: { minimizedComment: { isMinimized: false } } },
	])("requires a confirmed visibility change %#", async (response) => {
		// Arrange
		const f = fixture();
		f.graphql.mockResolvedValueOnce(response);

		// Act
		const update = f.visibility.synchronize(42, "Verified decision", true);

		// Assert
		await expect(update).rejects.toThrow("not confirmed");
	});
});
