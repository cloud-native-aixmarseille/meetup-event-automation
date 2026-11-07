import { describe, expect, it, vi } from "vitest";
import { GithubAttentionBudgetSource } from "./github-attention-budget-source.js";

describe("repository-wide budget discovery", () => {
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
			sort: "updated",
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
