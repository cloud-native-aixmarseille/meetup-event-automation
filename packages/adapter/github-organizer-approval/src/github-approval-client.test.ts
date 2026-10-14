import { describe, expect, it } from "vitest";
import { fixture } from "../testing/approval.fixtures.js";

describe("scoped GitHub approval client", () => {
	it("reads decision comments beyond the first page", async () => {
		// Arrange
		const f = fixture();
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
		const comments = await f.client.list();
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
