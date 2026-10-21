import { describe, expect, it } from "vitest";
import { GithubAttentionResponse } from "./github-attention-response.js";

const comment = { id: 100, node_id: "node-100", body: "Trusted body" };
describe("GitHub attention response validation", () => {
	it.each([
		null,
		[],
		{ id: 100, body: {} },
		{ id: 100, body: "text", user: { login: 42 } },
		{ id: 100, node_id: 12 },
	])("rejects malformed comments %j", (input) => {
		// Arrange
		const response: unknown = input;

		// Act
		const parse = () => GithubAttentionResponse.comment(response);

		// Assert
		expect(parse).toThrow();
	});
	it.each([
		{
			id: "node-100",
			body: "Trusted body",
			editor: { login: "automation", __typename: 42 },
			lastEditedAt: null,
		},
		{ id: "other", body: "Trusted body", editor: null, lastEditedAt: null },
		{ id: "node-100", body: "changed", editor: null, lastEditedAt: null },
	])("rejects invalid or concurrently changed editor evidence", (node) => {
		// Arrange
		const response = { node };

		// Act
		const parse = () => GithubAttentionResponse.current(response, comment);

		// Assert
		expect(parse).toThrow();
	});
	it("does not grant trust to malformed history entries", () => {
		// Arrange
		const response = {
			node: {
				id: "node-100",
				body: "Trusted body",
				userContentEdits: {
					nodes: [
						{ diff: "old", deletedAt: null, editor: { login: "automation" } },
					],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		};

		// Act
		const parse = () => GithubAttentionResponse.history(response, comment);

		// Assert
		expect(parse).toThrow();
	});
});
