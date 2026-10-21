import { describe, expect, it } from "vitest";
import { fixture } from "../testing/approval.fixtures.js";
import { GithubApprovalClient } from "./github-approval-client.js";

describe("scoped GitHub approval client", () => {
	it("reads decision comments beyond the first page", async () => {
		// Arrange
		const f = fixture();
		const client = new GithubApprovalClient(f.api, "example", "meetups", 42);
		f.list
			.mockResolvedValueOnce({
				data: [{ id: 1, body: "first page" }],
				headers: { link: '<https://api.github.com/next>; rel="next"' },
			})
			.mockResolvedValueOnce({
				data: [{ id: 2, body: "second page" }],
				headers: {},
			});

		// Act
		const comments = await client.list();

		// Assert
		expect(comments.map((comment) => comment.id)).toEqual([1, 2]);
		expect(f.list).toHaveBeenLastCalledWith({
			owner: "example",
			repo: "meetups",
			issue_number: 42,
			page: 2,
			per_page: 100,
		});
	});
});

describe("verified approval history", () => {
	it("loads all history pages against the same comment snapshot", async () => {
		// Arrange
		const f = fixture();
		const client = new GithubApprovalClient(f.api, "example", "meetups", 42);
		const comment = { id: 100, node_id: "comment-100", body: "current choice" };
		const recent = {
			diff: "current choice",
			deletedAt: null,
			editor: { login: "organizer", __typename: "User" },
		};
		const original = {
			diff: "trusted request",
			deletedAt: null,
			editor: { login: "automation", __typename: "Bot" },
		};
		f.graphql.mockResolvedValueOnce({
			node: {
				id: comment.node_id,
				body: comment.body,
				userContentEdits: {
					nodes: [recent],
					pageInfo: { hasNextPage: true, endCursor: "next-page" },
				},
			},
		});
		f.graphql.mockResolvedValueOnce({
			node: {
				id: comment.node_id,
				body: comment.body,
				userContentEdits: {
					nodes: [original],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		});

		// Act
		const result = await client.history(comment);

		// Assert
		expect(result).toEqual([recent, original]);
		expect(f.graphql).toHaveBeenLastCalledWith(
			expect.stringContaining("diff deletedAt"),
			{ id: "comment-100", after: "next-page" },
		);
	});
	it.each([
		"changed body",
		"changed node",
		"missing history",
		"missing cursor",
		"repeated cursor",
	])("fails closed on %s during history pagination", async (variant) => {
		// Arrange
		const f = fixture();
		const client = new GithubApprovalClient(f.api, "example", "meetups", 42);
		const comment = { id: 100, node_id: "comment-100", body: "current choice" };
		const history = {
			nodes: [],
			pageInfo: { hasNextPage: true, endCursor: "next-page" },
		};
		f.graphql.mockResolvedValueOnce({
			node: {
				id: comment.node_id,
				body: comment.body,
				userContentEdits: history,
			},
		});
		f.graphql.mockResolvedValueOnce({
			node: {
				id: variant === "changed node" ? "another-comment" : comment.node_id,
				body: variant === "changed body" ? "concurrent choice" : comment.body,
				userContentEdits:
					variant === "missing history"
						? null
						: {
								...history,
								pageInfo: {
									hasNextPage: true,
									endCursor: variant === "missing cursor" ? null : "next-page",
								},
							},
			},
		});

		// Act
		const result = client.history(comment);

		// Assert
		await expect(result).rejects.toThrow();
		expect(f.graphql).toHaveBeenCalledTimes(2);
	});
});
