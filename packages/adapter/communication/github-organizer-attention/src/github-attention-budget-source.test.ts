import { describe, expect, it, vi } from "vitest";
import { GithubAttentionBudgetSource } from "./github-attention-budget-source.js";

describe("repository-wide budget discovery", () => {
	it("does not skip another issue when an earlier comment is edited between pages", async () => {
		// Arrange
		const comments = Array.from({ length: 101 }, (_, index) => ({
			created: index,
			updated: index,
			issue_url: `https://api.github.com/repos/example/events/issues/${index === 100 ? 2 : 1}`,
			user: { login: "automation[bot]", type: "Bot" },
		}));
		const listCommentsForRepo = vi.fn(
			async (input: {
				sort: "created" | "updated";
				page: number;
				per_page: number;
			}) => {
				const offset = (input.page - 1) * input.per_page;
				const data = [...comments]
					.sort((left, right) => left[input.sort] - right[input.sort])
					.slice(offset, offset + input.per_page);
				if (input.page === 1) comments[0].updated = 102;
				return {
					data,
					headers:
						input.page === 1
							? { link: '<https://api.github.com/next>; rel="next"' }
							: {},
				};
			},
		);
		const source = new GithubAttentionBudgetSource(
			{ rest: { issues: { listCommentsForRepo } } },
			"example",
			"events",
			"automation[bot]",
		);
		// Act
		const issues = await source.issues(100);
		// Assert
		expect(issues).toEqual([1, 2]);
		expect(listCommentsForRepo).toHaveBeenCalledTimes(2);
	});
	it("paginates recent bot activity without filtering out closed issues", async () => {
		// Arrange
		const bot = { login: "automation[bot]", type: "Bot" };
		const listCommentsForRepo = vi
			.fn()
			.mockResolvedValueOnce({
				data: [
					{
						issue_url: "https://api.github.com/repos/example/events/issues/42",
						user: bot,
					},
					{
						issue_url: "https://api.github.com/repos/example/events/issues/42",
						user: bot,
					},
					{
						issue_url: "https://api.github.com/repos/example/events/issues/99",
						user: { login: "human", type: "User" },
					},
				],
				headers: { link: '<https://api.github.com/next>; rel="next"' },
			})
			.mockResolvedValueOnce({
				data: [
					{
						issue_url: "https://api.github.com/repos/example/events/issues/43",
						user: bot,
					},
				],
				headers: {},
			});
		const source = new GithubAttentionBudgetSource(
			{ rest: { issues: { listCommentsForRepo } } },
			"example",
			"events",
			"automation[bot]",
		);
		// Act
		const issues = await source.issues(100);
		// Assert
		expect(issues).toEqual([42, 43]);
		expect(listCommentsForRepo).toHaveBeenCalledTimes(2);
		expect(listCommentsForRepo.mock.calls[0][0]).toEqual({
			owner: "example",
			repo: "events",
			since: new Date(93 * 86_400_000).toISOString(),
			sort: "created",
			direction: "asc",
			page: 1,
			per_page: 100,
		});
	});
	it.each([
		"https://api.github.com/repos/other/events/issues/42",
		"https://api.github.com/repos/example/events/issues/invalid",
	])("rejects an invalid issue identity %s", async (issue_url) => {
		// Arrange
		const listCommentsForRepo = vi.fn().mockResolvedValue({
			data: [{ issue_url, user: { login: "automation[bot]", type: "Bot" } }],
			headers: {},
		});
		const source = new GithubAttentionBudgetSource(
			{ rest: { issues: { listCommentsForRepo } } },
			"example",
			"events",
			"automation[bot]",
		);
		// Act
		const issues = source.issues(100);
		// Assert
		await expect(issues).rejects.toThrow(
			"Invalid attention budget issue identity",
		);
	});
});
