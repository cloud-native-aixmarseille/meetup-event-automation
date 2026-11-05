import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
	type ActionManifest,
	readWorkflow,
	readYaml,
	workflowExpression,
} from "./support.js";

describe("social publication workflow boundaries", () => {
	it("holds the event lock through dispatch and independent result reporting", async () => {
		// Arrange
		const workflow = await readWorkflow("event-promotion-reconcile");
		// Act
		const publish = workflow.jobs?.publish;
		const dispatch = publish?.steps?.find((step) => step.id === "social");
		const report = workflow.jobs?.report;
		// Assert
		expect(workflow.concurrency).toEqual({
			group: workflowExpression(
				"format('meetup-event-{0}-{1}', github.repository_id, inputs.issue-number)",
			),
			"cancel-in-progress": false,
		});
		expect(dispatch?.uses).toBe("$/actions/communication/reconcile-social");
		expect(report?.needs).toBe("publish");
		expect(report?.if).toContain("always()");
		expect(report?.uses).toBe(
			"$/.github/workflows/__organizer-reconcile-reporting.yml",
		);
		expect(report?.with?.["stage-results"]).toContain('"social"');
		expect(report?.with?.["stage-results"]).toContain(
			"needs.publish.outputs.social-diagnostics",
		);
		expect(publish?.outputs?.["social-outcome"]).toBe(
			workflowExpression(
				"steps.review.outcome == 'success' && steps.social.outcome || steps.review.outcome",
			),
		);
	});
	it("keeps generation and review credentials outside the public dispatch action", async () => {
		// Arrange
		const workflow = await readWorkflow("event-promotion-reconcile");
		const action = await readYaml<ActionManifest>(
			"actions/communication/reconcile-social/action.yml",
		);
		// Act
		const inputs = Object.keys(action.inputs ?? {});
		const secrets = Object.keys(workflow.on?.workflow_call?.secrets ?? {});
		// Assert
		expect(inputs).toContain("social-credentials");
		expect(secrets).toContain("social-credentials");
		expect(inputs.some((name) => name.startsWith("ai-"))).toBe(false);
		expect(inputs).not.toContain("google-credentials");
		expect(secrets).toContain("google-credentials");
		expect(secrets).toContain("ai-api-key");
		const steps = workflow.jobs?.publish?.steps ?? [];
		const prepare = steps.find((step) => step.id === "reminders");
		const review = steps.find((step) => step.id === "review");
		const publish = steps.find((step) => step.id === "social");
		expect(prepare?.uses).toBe("$/actions/communication/prepare-reminders");
		expect(review?.uses).toBe("$/actions/organizer/review-drafts");
		expect(steps.findIndex((step) => step.id === "reminders")).toBeLessThan(
			steps.findIndex((step) => step.id === "review"),
		);
		expect(steps.findIndex((step) => step.id === "review")).toBeLessThan(
			steps.findIndex((step) => step.id === "social"),
		);
		expect(publish?.if).toContain("!cancelled()");
		expect(publish?.with).not.toHaveProperty("ai-api-key");
		expect(workflow.jobs?.report?.with?.["stage-results"]).toContain(
			"needs.publish.outputs.reminders-diagnostics",
		);
		expect(workflow.jobs?.report?.with?.["stage-results"]).toContain(
			"needs.publish.outputs.review-diagnostics",
		);
		expect(action.outputs).toEqual({
			diagnostics: { description: "Redacted social-publication diagnostics." },
		});
	});
	it("keeps recovery under the event lock without publishing or requesting provider credentials", async () => {
		// Arrange
		const workflow = await readWorkflow("event-promotion-recover");
		// Act
		const steps = workflow.jobs?.recover?.steps ?? [];
		const secrets = Object.keys(workflow.on?.workflow_call?.secrets ?? {});
		// Assert
		expect(workflow.concurrency).toEqual({
			group: workflowExpression(
				"format('meetup-event-{0}-{1}', github.repository_id, inputs.issue-number)",
			),
			"cancel-in-progress": false,
		});
		expect(
			steps.some(
				(step) => step.uses === "$/actions/communication/recover-social",
			),
		).toBe(true);
		expect(
			steps.some(
				(step) => step.uses === "$/actions/communication/reconcile-social",
			),
		).toBe(false);
		expect(secrets).not.toContain("social-credentials");
	});
	it("scans active issues with bounded independent reconciliation and delegates due-time policy", async () => {
		// Arrange
		const workflow = await readWorkflow("event-promotion-reconcile-active");
		// Act
		const audit = workflow.jobs?.audit;
		// Assert
		expect(
			workflow.jobs?.list?.steps?.some(
				(step) => step.uses === "$/actions/event/list-active",
			),
		).toBe(true);
		expect(audit?.strategy).toMatchObject({
			"fail-fast": false,
			"max-parallel": 4,
		});
		expect(audit?.uses).toBe(
			"$/.github/workflows/event-promotion-reconcile.yml",
		);
		expect(audit?.with?.["issue-number"]).toBe(
			workflowExpression("matrix.issue-number"),
		);
		expect(audit?.secrets?.["social-credentials"]).toBe(
			workflowExpression("secrets.social-credentials"),
		);
	});
	it("limits comment-triggered reconciliation to human edits of managed approval comments", async () => {
		// Arrange
		const workflow = await readWorkflow("event-promotion-reconcile");
		// Act
		const guard = workflow.jobs?.publish?.if ?? "";
		// Assert
		for (const condition of [
			"github.event_name != 'issue_comment'",
			"!github.event.issue.pull_request",
			"github.event.issue.state == 'open'",
			"github.event.action == 'edited'",
			"github.event.sender.type == 'User'",
			"github.event.comment.user.type == 'Bot'",
			"startsWith(github.event.comment.body, '<!-- meetup-organizer-approval:v1 ')",
		])
			expect(guard).toContain(condition);
	});
	it.each([
		{ name: "content review", kind: "content-review", allowed: true },
		{ name: "publication approval", kind: "social-publication", allowed: true },
		{ name: "event publication", kind: "meetup-publication", allowed: true },
		{ name: "bot edit", sender: "Bot", allowed: false },
		{ name: "human-authored comment", author: "User", allowed: false },
		{ name: "unmanaged comment", managed: false, allowed: false },
		{ name: "new comment", action: "created", allowed: false },
		{ name: "closed issue", state: "closed", allowed: false },
		{ name: "pull request", pullRequest: {}, allowed: false },
		{ name: "scheduled audit", event: "schedule", allowed: true },
		{
			name: "manual reconciliation",
			event: "workflow_dispatch",
			allowed: true,
		},
	])("evaluates $name: $allowed", async (scenario) => {
		// Arrange
		const workflow = await readWorkflow("event-promotion-reconcile");
		const expression = (workflow.jobs?.publish?.if ?? "").trim().slice(3, -2);
		const github = {
			event_name: scenario.event ?? "issue_comment",
			event: {
				action: scenario.action ?? "edited",
				sender: { type: scenario.sender ?? "User" },
				issue: {
					state: scenario.state ?? "open",
					pull_request: scenario.pullRequest,
				},
				comment: {
					user: { type: scenario.author ?? "Bot" },
					body:
						scenario.managed === false
							? "An ordinary discussion comment"
							: `<!-- meetup-organizer-approval:v1 ${JSON.stringify({ kind: scenario.kind ?? "content-review" })} -->`,
				},
			},
		};

		// Act
		// The guard uses the JS-compatible boolean subset of Actions expressions.
		const allowed = runInNewContext(expression, {
			github,
			startsWith: (value: string, prefix: string) => value.startsWith(prefix),
			contains: (value: string, part: string) => value.includes(part),
		});

		// Assert
		expect(allowed).toBe(scenario.allowed);
	});
});
