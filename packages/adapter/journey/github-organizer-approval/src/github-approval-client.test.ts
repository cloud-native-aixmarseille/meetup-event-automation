import { describe, expect, it } from "vitest";
import { fixture } from "../testing/approval.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { GithubApprovalClient } from "./github-approval-client.js";

describe("scoped GitHub approval client", () => {
	it("verifies comment editors in bounded batches", async () => {
		// Arrange
		const f = fixture();
		const comments = Array.from({ length: 101 }, (_, index) => ({
			id: index + 1,
			node_id: `comment-${index + 1}`,
			body: `body-${index}`,
		}));
		f.graphql.mockImplementation(async (_query, { ids }) => ({
			nodes: ids.map((id: string) => ({
				id,
				body: comments.find((comment) => comment.node_id === id)?.body,
				editor: null,
				lastEditedAt: null,
			})),
		}));

		// Act
		const edits = await f.client.edits(comments);

		// Assert
		expect(edits).toHaveLength(101);
		expect(f.graphql).toHaveBeenCalledTimes(2);
		expect(
			f.graphql.mock.calls.map(([, variables]) => variables.ids.length),
		).toEqual([100, 1]);
	});
	it.each([
		null,
		{ id: "different", body: "expected", editor: null, lastEditedAt: null },
		{ id: "comment-1", body: "changed", editor: null, lastEditedAt: null },
	])(
		"rejects missing or concurrently changed snapshots in a batch: %j",
		async (node) => {
			// Arrange
			const f = fixture();
			f.graphql.mockResolvedValue({ nodes: [node] });

			// Act
			const reading = f.client.edits([
				{ id: 1, node_id: "comment-1", body: "expected" },
			]);

			// Assert
			await expect(reading).rejects.toThrow(
				node?.id === "comment-1"
					? "Organizer comment changed during verification"
					: "Invalid approval comment snapshot",
			);
		},
	);

	it("reads decision comments beyond the first page", async () => {
		// Arrange
		const f = fixture();
		const client = new GithubApprovalClient(
			{
				githubApprovalResponse:
					new GithubOrganizerApprovalComposition().githubApprovalResponse(),
			},
			f.api,
			"example",
			"meetups",
			42,
		);
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
	it("reads bounded history batches and completes long histories in their original order", async () => {
		// Arrange
		const f = fixture();
		const comments = Array.from({ length: 6 }, (_, index) => ({
			id: index + 1,
			node_id: `comment-${index + 1}`,
			body: `body-${index}`,
		}));
		const edit = {
			diff: "saved body",
			deletedAt: null,
			editor: { login: "automation", __typename: "Bot" },
		};
		f.graphql.mockImplementation(async (_query, variables) => {
			const nodes = (variables.ids ?? [variables.id]).map((id: string) => ({
				id,
				body: comments.find((comment) => comment.node_id === id)?.body,
				userContentEdits: {
					nodes: [{ ...edit, diff: variables.after ? "oldest body" : id }],
					pageInfo: {
						hasNextPage: id === "comment-2" && !variables.after,
						endCursor: "next-page",
					},
				},
			}));
			return variables.ids ? { nodes } : { node: nodes[0] };
		});

		// Act
		const histories = await f.client.histories(comments);

		// Assert
		expect(
			histories.map((history) => history.map((entry) => entry.diff)),
		).toEqual([
			["comment-1"],
			["comment-2", "oldest body"],
			["comment-3"],
			["comment-4"],
			["comment-5"],
			["comment-6"],
		]);
		expect(f.graphql.mock.calls.map(([, variables]) => variables)).toEqual([
			{ ids: comments.slice(0, 5).map((comment) => comment.node_id) },
			{ id: "comment-2", after: "next-page" },
			{ ids: ["comment-6"] },
		]);
		expect(f.graphql.mock.calls[0][0]).toContain("userContentEdits(first: 20)");
	});
	it.each([
		"missing node",
		"missing history",
		"changed identity",
		"changed body",
		"missing cursor",
		"missing result",
	])("rejects an unverifiable batched history: %s", async (variant) => {
		// Arrange
		const f = fixture();
		const comment = { id: 1, node_id: "comment-1", body: "saved body" };
		const node = {
			id: variant === "changed identity" ? "different" : comment.node_id,
			body: variant === "changed body" ? "changed" : comment.body,
			userContentEdits:
				variant === "missing history"
					? null
					: {
							nodes: [],
							pageInfo: { hasNextPage: true, endCursor: null },
						},
		};
		f.graphql.mockResolvedValue({
			nodes:
				variant === "missing result"
					? []
					: [variant === "missing node" ? null : node],
		});

		// Act
		const reading = f.client.histories([comment]);

		// Assert
		await expect(reading).rejects.toThrow();
		expect(f.graphql).toHaveBeenCalledTimes(1);
	});
	it("rejects a repeated cursor when continuing a batched history", async () => {
		// Arrange
		const f = fixture();
		const comment = { id: 1, node_id: "comment-1", body: "saved body" };
		const node = {
			id: comment.node_id,
			body: comment.body,
			userContentEdits: {
				nodes: [],
				pageInfo: { hasNextPage: true, endCursor: "cursor" },
			},
		};
		f.graphql
			.mockResolvedValueOnce({ nodes: [node] })
			.mockResolvedValue({ node });

		// Act
		const reading = f.client.histories([comment]);

		// Assert
		await expect(reading).rejects.toThrow("Invalid approval history cursor");
		expect(f.graphql).toHaveBeenCalledTimes(2);
	});
	it("does not request empty history batches", async () => {
		// Arrange
		const f = fixture();

		// Act
		const histories = await f.client.histories([]);

		// Assert
		expect(histories).toEqual([]);
		expect(f.graphql).not.toHaveBeenCalled();
	});
	it("loads all history pages against the same comment snapshot", async () => {
		// Arrange
		const f = fixture();
		const client = new GithubApprovalClient(
			{
				githubApprovalResponse:
					new GithubOrganizerApprovalComposition().githubApprovalResponse(),
			},
			f.api,
			"example",
			"meetups",
			42,
		);
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
		const client = new GithubApprovalClient(
			{
				githubApprovalResponse:
					new GithubOrganizerApprovalComposition().githubApprovalResponse(),
			},
			f.api,
			"example",
			"meetups",
			42,
		);
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
