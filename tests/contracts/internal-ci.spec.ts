import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	readWorkflow,
	root,
	sortedKeys,
	workflowExpression,
} from "./support.js";

describe("internal CI contracts", () => {
	it("routes main and pull-request CI through the shared workflow", async () => {
		// Arrange
		const workflowDirectory = join(root, ".github/workflows");

		// Act
		const main = await readWorkflow("__main-ci");
		const pullRequest = await readWorkflow("__pull-request-ci");
		const shared = await readWorkflow("__shared-ci");
		const actionChecks = await readWorkflow("__check-actions");
		const nodeChecks = await readWorkflow("__check-nodejs");
		const build = String(nodeChecks.jobs?.["test-nodejs"].with?.build ?? "");
		const workflowFiles = await readdir(workflowDirectory);
		const dedicatedVitestGateOccurrences = (
			await Promise.all(
				workflowFiles
					.filter((name) => name.endsWith(".yml"))
					.map((name) =>
						readFile(join(root, ".github/workflows", name), "utf8"),
					),
			)
		).reduce(
			(count, source) =>
				count +
				(source.match(/\bcheck:(?:architecture|contracts)\b/g)?.length ?? 0),
			0,
		);

		// Assert
		expect(main.jobs?.ci.uses).toBe("$/.github/workflows/__shared-ci.yml");
		expect(pullRequest.jobs?.ci).toEqual(main.jobs?.ci);
		expect(pullRequest.on?.pull_request).toEqual({});
		expect(shared.jobs?.["check-actions"]).toMatchObject({
			needs: ["check-nodejs", "check-dist"],
			uses: "$/.github/workflows/__check-actions.yml",
			permissions: {
				contents: "read",
				issues: "write",
			},
		});
		expect(build.split("\n")).toEqual(
			expect.arrayContaining(["workspace:build", "package"]),
		);
		expect(nodeChecks.jobs?.["test-nodejs"].with?.test).toContain("coverage");
		expect(
			workflowFiles.filter((name) =>
				/^__test-(?:action|workflow|component)/.test(name),
			),
		).toEqual([]);
		expect(workflowFiles).toContain("__main-ci.yml");
		expect(workflowFiles).toContain("__check-actions.yml");
		expect(workflowFiles).toContain("__pull-request-ci.yml");
		expect(workflowFiles).toContain("__greetings.yml");
		expect(workflowFiles).toContain("__need-fix-to-issue.yml");
		expect(workflowFiles).toContain("__semantic-pull-request.yml");
		expect(workflowFiles).toContain("__stale.yml");
		expect(workflowFiles).not.toContain("main-ci.yml");
		expect(workflowFiles).not.toContain("pull-request-ci.yml");
		expect(workflowFiles).not.toContain("greetings.yml");
		expect(workflowFiles).not.toContain("need-fix-to-issue.yml");
		expect(workflowFiles).not.toContain("semantic-pull-request.yml");
		expect(workflowFiles).not.toContain("stale.yml");
		expect(sortedKeys(actionChecks.jobs)).toEqual(
			[
				"cleanup-synthetic-issue",
				"prepare-synthetic-issue",
				"test-communication-reconcile",
				"test-event-list-active",
				"test-event-reconcile",
				"test-assets-reconcile-documents",
				"test-feedback-reconcile-event",
				"test-issue-form-reconcile",
				"test-referential-validate",
				"test-organizer-reconcile-checklist",
			].sort(),
		);
		expect(actionChecks.jobs?.["prepare-synthetic-issue"]?.permissions).toEqual(
			{
				contents: "read",
				issues: "write",
			},
		);
		expect(
			actionChecks.jobs?.["test-referential-validate"]?.permissions,
		).toEqual({
			contents: "read",
		});
		expect(
			actionChecks.jobs?.["test-issue-form-reconcile"]?.permissions,
		).toEqual({
			contents: "read",
		});
		expect(actionChecks.jobs?.["test-event-list-active"]?.needs).toBe(
			"prepare-synthetic-issue",
		);
		expect(actionChecks.jobs?.["test-event-reconcile"]?.needs).toBe(
			"prepare-synthetic-issue",
		);
		expect(actionChecks.jobs?.["test-communication-reconcile"]?.needs).toBe(
			"prepare-synthetic-issue",
		);
		expect(actionChecks.jobs?.["cleanup-synthetic-issue"]?.needs).toEqual([
			"prepare-synthetic-issue",
			"test-event-list-active",
			"test-event-reconcile",
			"test-communication-reconcile",
		]);
		expect(dedicatedVitestGateOccurrences).toBe(0);
	});

	it("waits for fixture visibility before action checks and preserves cleanup on setup failure", async () => {
		// Arrange
		const workflow = await readWorkflow("__check-actions");

		// Act
		const preparation = workflow.jobs?.["prepare-synthetic-issue"];
		const steps = preparation?.steps ?? [];
		const creationIndex = steps.findIndex((step) => step.id === "create-issue");
		const readinessIndex = steps.findIndex((step) =>
			String(step.with?.script).includes("waitForSyntheticIssue"),
		);
		const readiness = steps[readinessIndex];
		const cleanup = workflow.jobs?.["cleanup-synthetic-issue"];
		const closeIssue = cleanup?.steps?.find(
			(step) => step.name === "Close synthetic meetup issue",
		);

		// Assert
		expect(creationIndex).toBeGreaterThanOrEqual(0);
		expect(readinessIndex).toBeGreaterThan(creationIndex);
		expect(preparation?.outputs?.["issue-number"]).toBe(
			workflowExpression("steps.create-issue.outputs.issue-number"),
		);
		expect(steps[creationIndex]?.with?.script).toContain(
			"core.setOutput('issue-number', String(issue.data.number))",
		);
		expect(readiness?.env?.ISSUE_NUMBER).toBe(
			workflowExpression("steps.create-issue.outputs.issue-number"),
		);
		expect(readiness?.with?.script).toContain(
			"tests/integration/github-actions/wait-for-synthetic-issue.mjs",
		);
		expect(readiness?.with?.script).toContain("await waitForSyntheticIssue({");
		expect(readiness?.["continue-on-error"]).not.toBe(true);
		expect(cleanup?.if).toBe("always()");
		expect(closeIssue?.if).toBe(
			"needs.prepare-synthetic-issue.outputs.issue-number != ''",
		);
		expect(closeIssue?.env?.ISSUE_NUMBER).toBe(
			workflowExpression("needs.prepare-synthetic-issue.outputs.issue-number"),
		);
	});

	it("runs event and communication integration checks under the same synthetic event lock", async () => {
		// Arrange
		const workflow = await readWorkflow("__check-actions");

		// Act
		const job = workflow.jobs?.["test-communication-reconcile"];
		const eventJob = workflow.jobs?.["test-event-reconcile"];
		const communication = job?.steps?.find(
			(step) => step.uses === "$/actions/communication/reconcile-email",
		);
		const fixture = workflow.jobs?.["prepare-synthetic-issue"]?.steps?.find(
			(step) => step.id === "create-issue",
		);
		const assertions = job?.steps?.find(
			(step) => step.name === "Assert communication reconciliation",
		);

		// Assert
		expect(job?.concurrency).toEqual({
			group: `meetup-event-${workflowExpression("github.repository_id")}-${workflowExpression("needs.prepare-synthetic-issue.outputs.issue-number")}`,
			"cancel-in-progress": false,
		});
		expect(eventJob?.concurrency).toEqual(job?.concurrency);
		expect(eventJob?.permissions?.issues).toBe("write");
		expect(communication?.with).not.toHaveProperty("mode");
		expect(communication?.with).not.toHaveProperty("dispatch-authorized");
		expect(fixture?.with?.script).toContain("- [x] Mail introduction");
		expect(assertions?.run).toContain('all(.[]; .severity != "error")');
		expect(communication?.with?.["slides-ready"]).toBe("true");
	});

	it("delegates documentation updates to reusable release workflows", async () => {
		// Arrange
		const workflow = await readWorkflow("__main-ci");

		// Act
		const release = workflow.jobs?.release ?? {};

		// Assert
		expect(release.needs).toBe("ci");
		expect(release.uses).toMatch(
			/^hoverkraft-tech\/ci-github-publish\/\.github\/workflows\/release-actions\.yml@[0-9a-f]{40}$/,
		);
		expect(release.permissions).toEqual({
			contents: "write",
			"pull-requests": "write",
		});
		expect(release.with).toMatchObject({
			"github-app-client-id": workflowExpression("vars.CI_BOT_APP_CLIENT_ID"),
			"update-all": workflowExpression("startsWith(github.ref, 'refs/tags/')"),
		});
		expect(release.secrets).toMatchObject({
			"github-app-key": workflowExpression("secrets.CI_BOT_APP_PRIVATE_KEY"),
			"github-token": workflowExpression("secrets.GITHUB_TOKEN"),
		});
	});
});
