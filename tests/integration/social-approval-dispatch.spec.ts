import { GithubOrganizerApprovalComposition } from "../../packages/adapter/journey/github-organizer-approval/src/dependency-composition.js";
import { SocialPublicationComposition } from "../../packages/application/journey/src/social-publication-composition.js";
import { describe, expect, it } from "vitest";
import {
	decision,
	fixture,
} from "../../packages/adapter/journey/github-organizer-approval/testing/approval.fixtures.js";
import { socialFixture } from "../../packages/application/journey/testing/social-publication.fixtures.js";

describe("GitHub approval to social delivery", () => {
	it("publishes an approved request once through repeated authority checks", async () => {
		// Arrange
		const github = fixture();
		const f = await socialFixture();
		const approvals =
			new GithubOrganizerApprovalComposition().githubOrganizerApproval(
				github.repository,
				github.records,
				github.finalizer,
				github.notifications,
				github.client,
			);
		const reconcile = new SocialPublicationComposition().create({
			...f.dependencies,
			approvals,
		});
		const identity = { repository: "example/meetups", issueNumber: 42 };

		// Act
		const pending = await reconcile.execute(identity);
		decision(github, { lastEditedAt: f.state.now });
		const approved = await reconcile.execute(identity);
		const repeated = await reconcile.execute(identity);

		// Assert
		expect(pending.publications[0]?.status).toBe("pending");
		expect(approved.publications[0]?.status).toBe("published");
		expect(approved.diagnostics).toEqual([]);
		expect(repeated.publications[0]?.status).toBe("complete");
		expect(f.posts.publish).toHaveBeenCalledOnce();
		expect([...f.records.values()][0]?.attempts).toEqual([
			expect.objectContaining({
				status: "accepted",
				receipt: expect.objectContaining({ provider: "slack" }),
			}),
		]);
	});
});
