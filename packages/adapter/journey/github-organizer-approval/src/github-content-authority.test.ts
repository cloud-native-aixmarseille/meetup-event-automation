import { describe, expect, it, vi } from "vitest";
import { contentFixture } from "../../../../application/journey/testing/promotional-content.fixtures.js";
import { createStoredApproval } from "../testing/approval.fixtures.js";
import { contentRequest } from "../testing/content.fixtures.js";
import { GithubContentAuthority } from "./github-content-authority.js";

describe("content authority", () => {
	it.each(["current", "revoked", "changed-revision", "different-actor"])(
		"verifies %s approval against the independent trusted request",
		async (scenario) => {
			// Arrange
			const f = contentFixture();
			const decision = {
				status: "approved" as const,
				actor: "organizer",
				decidedAt: "2026-10-01T10:00:00Z",
			};
			const proposal = {
				...f.proposal,
				revision: contentRequest.revision,
				decision,
			};
			const record = {
				...createStoredApproval({
					...contentRequest,
					content: { ...contentRequest.content, key: proposal.id },
				}),
				decision,
			};
			if (scenario === "changed-revision") record.revision = "d".repeat(64);
			if (scenario === "different-actor")
				record.decision = { ...decision, actor: "another-organizer" };
			const canApprove = vi.fn(async () => scenario !== "revoked");
			const authority = new GithubContentAuthority(
				{
					states: vi.fn(async () => [{ record, comment: { id: 1, body: "" } }]),
				},
				{ canApprove },
			);
			// Act
			const authorized = await authority.authorized(proposal);
			// Assert
			expect(authorized).toBe(scenario === "current");
		},
	);
});
