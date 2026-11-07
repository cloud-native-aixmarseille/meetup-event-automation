import { CommunicationDomainComposition } from "../../packages/domain/communication/src/dependency-composition.js";
import { GithubAutomationStateComposition } from "../../packages/adapter/journey/github-automation-state/src/dependency-composition.js";
import { GithubOrganizerAttentionComposition } from "../../packages/adapter/communication/github-organizer-attention/src/dependency-composition.js";
import { SharedAttentionBudget } from "../../packages/application/journey/src/use-cases/shared-attention-budget.js";
import { describe, expect, it, vi } from "vitest";
import { fixture } from "../../packages/adapter/journey/github-organizer-approval/testing/approval.fixtures.js";
import {
	observation,
	reconciliationFixture,
} from "../../packages/domain/communication/testing/attention.fixtures.js";

function sharedChannel() {
	const issues = new Map([1, 2, 3, 4].map((issue) => [issue, fixture()]));
	const domain = new CommunicationDomainComposition();
	const adapter = new GithubOrganizerAttentionComposition();
	const source = adapter.githubAttentionBudgetSource(
		{
			rest: {
				issues: {
					listCommentsForRepo: vi.fn(async () => ({
						data: [...issues].flatMap(([issue, f]) =>
							f.comments.map((comment) => ({
								user: comment.user,
								issue_url: `https://api.github.com/repos/example/meetups/issues/${issue}`,
							})),
						),
						headers: {},
					})),
				},
			},
		},
		"example",
		"meetups",
		"automation[bot]",
	);
	const state = (issue: number) => {
		const f = issues.get(issue);
		if (!f) throw new Error("Missing synthetic issue");
		return new GithubAutomationStateComposition().create(
			f.client,
			"automation[bot]",
			"en",
			f.visibility,
		);
	};
	const runs = [...issues.keys()].map((issue) => {
		const f = reconciliationFixture();
		const budget = new SharedAttentionBudget(
			domain.attentionBudgetPolicy(),
			adapter.githubAttentionBudget(source, state, issue, "C123"),
			issue,
		);
		return {
			...f,
			run: domain.reconcileAttention(
				f.repository,
				f.notification,
				{ now: () => new Date("2099-06-01T10:00:00Z") },
				budget,
			),
		};
	});
	return { issues, state, runs };
}

describe("shared channel technical-comment accounting", () => {
	it("persists three posts across separate issues and keeps a fourth task visible on reruns", async () => {
		// Arrange
		const f = sharedChannel();
		const results = [];
		// Act: official reporting serializes these runs with the channel lock.
		for (const run of f.runs)
			results.push(await run.run.execute(observation()));
		const repeated = await f.runs[3].run.execute(observation());
		const records = await Promise.all(
			[...f.issues.keys()].map((issue) => f.state(issue).read("attention")),
		);
		// Assert
		expect(results.map((result) => result.posted)).toEqual([
			true,
			true,
			true,
			false,
		]);
		expect(repeated).toMatchObject({ posted: false, active: 1 });
		expect(f.runs[3].state()?.episodes[0]).toMatchObject({ status: "active" });
		expect(f.runs[3].state()?.episodes[0].lastWindow).toBeUndefined();
		expect(records.flat()).toHaveLength(3);
		for (const issue of [1, 2, 3]) {
			expect(f.issues.get(issue)?.comments).toHaveLength(1);
			expect(f.issues.get(issue)?.comments[0].body).toContain(
				"meetup-automation-state:v1",
			);
			expect(records[issue - 1][0]).toContain('"status":"accepted"');
		}
	});
	it("keeps an ambiguous post reserved across issues and prevents an automatic duplicate", async () => {
		// Arrange
		const f = sharedChannel();
		f.runs[0].notification.post.mockRejectedValueOnce(
			new Error("lost acknowledgement"),
		);
		// Act
		const results = [];
		for (const run of f.runs)
			results.push(await run.run.execute(observation()));
		const retried = await f.runs[0].run.execute(observation());
		const records = await f.state(1).read("attention");
		// Assert
		expect(results.map((result) => result.posted)).toEqual([
			false,
			true,
			true,
			false,
		]);
		expect(retried).toMatchObject({ posted: false, notificationFailed: true });
		expect(f.runs[0].notification.post).toHaveBeenCalledTimes(1);
		expect(records[0]).toContain('"status":"pending"');
	});
});
