import { describe, expect, it } from "vitest";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { GithubApprovalResponse } from "./github-approval-response.js";

describe("GitHub approval response boundary", () => {
	it.each([
		null,
		{ data: null, headers: {} },
		{ data: [null], headers: {} },
		{ data: [{ id: "1" }], headers: {} },
		{ data: [{ id: 1, user: { login: false } }], headers: {} },
		{ data: [{ id: 1 }], headers: { link: false } },
	])("rejects malformed comment listing data: %j", (value) => {
		// Arrange
		const response: unknown = value;

		// Act
		const read = () =>
			new GithubApprovalResponse({
				approvalSchema:
					new GithubOrganizerApprovalComposition().approvalSchema(),
			}).comments(response);

		// Assert
		expect(read).toThrow("Invalid approval comment response");
	});

	it.each([undefined, {}, { login: 42, __typename: "User" }, false])(
		"rejects malformed editor evidence: %j",
		(editor) => {
			// Arrange
			const comment = { id: 1, node_id: "node-1", body: "request" };
			const response = {
				node: { id: "node-1", body: "request", lastEditedAt: null, editor },
			};

			// Act
			const read = () =>
				new GithubApprovalResponse({
					approvalSchema:
						new GithubOrganizerApprovalComposition().approvalSchema(),
				}).edit(response, comment);

			// Assert
			expect(read).toThrow("Invalid approval editor response");
		},
	);

	it.each([
		{ nodes: [null], pageInfo: { hasNextPage: false, endCursor: null } },
		{ nodes: [], pageInfo: { hasNextPage: "false", endCursor: null } },
		{ nodes: [], pageInfo: { hasNextPage: true, endCursor: 1 } },
	])("rejects malformed history before trusting a revision: %j", (history) => {
		// Arrange
		const comment = { id: 1, node_id: "node-1", body: "request" };
		const response = {
			node: { id: "node-1", body: "request", userContentEdits: history },
		};

		// Act
		const read = () =>
			new GithubApprovalResponse({
				approvalSchema:
					new GithubOrganizerApprovalComposition().approvalSchema(),
			}).history(response, comment);

		// Assert
		expect(read).toThrow("Approval history is unavailable");
	});
});
