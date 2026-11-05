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
	it("limits comment-triggered publication to human edits of trusted social approval comments", async () => {
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
			`'"kind":"social-publication"'`,
		])
			expect(guard).toContain(condition);
	});
});
