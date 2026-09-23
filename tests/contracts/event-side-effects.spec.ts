import { describe, expect, it } from "vitest";
import {
	type ActionManifest,
	automationActionPrefix,
	findStep,
	managedAuthor,
	readWorkflow,
	readYaml,
	type Step,
	sortedKeys,
	workflowExpression,
} from "./support.js";

describe("event side-effect safeguards", () => {
	it.each([
		["update-meetup-issue", "manage"],
		["check-active-meetup-issues", "audit"],
	] as const)(
		"keeps asset mutations optional and locked in %s",
		async (name, jobName) => {
			// Arrange
			const actionPath = "actions/publication/reconcile-assets/action.yml";

			// Act
			const action = await readYaml<ActionManifest>(actionPath);
			const workflow = await readWorkflow(name);
			const job = workflow.jobs?.[jobName] ?? {};
			const step = findStep(
				job,
				`${automationActionPrefix}publication/reconcile-assets`,
			);

			// Assert
			expect(action.inputs?.["google-credentials"]?.required).toBe(false);
			expect(job.concurrency?.["cancel-in-progress"]).toBe(false);
			expect(step?.with).toMatchObject({
				mode: "fix",
				"google-credentials": workflowExpression("secrets.google-credentials"),
				"managed-comment-author": managedAuthor,
				"google-drive-meetup-folder-id": workflowExpression(
					"inputs.google-drive-meetup-folder-id",
				),
				"google-drive-meetup-template-folder-id": workflowExpression(
					"inputs.google-drive-meetup-template-folder-id",
				),
			});
			expect(step?.with).not.toHaveProperty("mutation-authorized");
			expect(step?.env).toBeUndefined();
			expect(
				workflow.on?.workflow_call?.secrets?.["google-credentials"]?.required,
			).toBe(false);
			expect(
				workflow.on?.workflow_call?.inputs?.["google-drive-meetup-folder-id"],
			).toBeDefined();
			expect(
				workflow.on?.workflow_call?.inputs?.[
					"google-drive-meetup-template-folder-id"
				],
			).toBeDefined();
		},
	);

	it("shares one non-cancelling event lock between issue and audit paths", async () => {
		// Arrange
		const manage = await readWorkflow("update-meetup-issue");
		const audit = await readWorkflow("check-active-meetup-issues");
		const manageLock = manage.jobs?.manage.concurrency;

		// Act
		const auditLock = audit.jobs?.audit.concurrency;

		// Assert
		expect(manageLock).toEqual({
			"cancel-in-progress": false,
			group: `meetup-event-${workflowExpression("github.repository_id")}-${workflowExpression("github.event.issue.number")}`,
		});
		expect(auditLock).toEqual({
			"cancel-in-progress": false,
			group: `meetup-event-${workflowExpression("github.repository_id")}-${workflowExpression("matrix.issue-number")}`,
		});
	});

	it.each([
		["update-meetup-issue", "manage"],
		["check-active-meetup-issues", "audit"],
	] as const)(
		"derives managed authors from the scoped token in %s",
		async (workflowName, jobName) => {
			// Arrange
			const actions = ["event/reconcile", "communication/reconcile"];

			// Act
			const workflow = await readWorkflow(workflowName);
			const job = workflow.jobs?.[jobName] ?? {};
			const appTokenIndex = (job.steps ?? []).findIndex(
				(step: Step) =>
					step.id === "app-token" &&
					step.uses?.startsWith("actions/create-github-app-token@"),
			);
			const actionSteps = actions.map((action) => {
				const stepIndex = (job.steps ?? []).findIndex(
					(step: Step) => step.uses === `${automationActionPrefix}${action}`,
				);
				return { stepIndex, step: job.steps?.[stepIndex] };
			});

			// Assert
			for (const { stepIndex, step } of actionSteps) {
				expect(stepIndex).toBeGreaterThan(appTokenIndex);
				expect(step?.with?.["managed-comment-author"]).toBe(managedAuthor);
			}
			expect(workflow.on?.workflow_call?.inputs ?? {}).not.toHaveProperty(
				"managed-comment-author",
			);
		},
	);

	it.each([
		{
			job: "manage",
			mode: "dispatch",
			workflow: "update-meetup-issue",
		},
		{
			job: "audit",
			mode: "dispatch",
			workflow: "check-active-meetup-issues",
		},
	] as const)(
		"authorizes dispatch under the event lock in $workflow",
		async (item) => {
			// Arrange
			// Use the shared fixtures.

			// Act
			const workflow = await readWorkflow(item.workflow);
			const job = workflow.jobs?.[item.job] ?? {};
			const step = findStep(
				job,
				`${automationActionPrefix}communication/reconcile`,
			);

			// Assert
			expect(job.concurrency?.["cancel-in-progress"]).toBe(false);
			expect(step?.with?.mode).toBe(item.mode);
			expect(step?.with?.["dispatch-authorized"]).toBe("true");
		},
	);

	it("keeps scheduled audits code-owned and config-gated", async () => {
		// Arrange
		const workflowName = "check-active-meetup-issues";

		// Act
		const workflow = await readWorkflow(workflowName);
		const job = workflow.jobs?.audit ?? {};
		const token = (job.steps ?? []).find(
			(step: Step) => step.id === "app-token",
		);
		const event = findStep(job, `${automationActionPrefix}event/reconcile`);
		const communication = findStep(
			job,
			`${automationActionPrefix}communication/reconcile`,
		);
		const summary = (job.steps ?? []).find(
			(step: Step) => step.name === "Add redacted audit summary",
		);

		// Assert
		expect(sortedKeys(workflow.on?.workflow_call?.inputs)).toEqual([
			"github-app-id",
			"google-drive-meetup-folder-id",
			"google-drive-meetup-template-folder-id",
			"kutt-link-id",
			"slack-channel-id",
		]);
		expect(token?.with?.["app-id"]).toBe(
			workflowExpression("inputs.github-app-id"),
		);
		expect(token?.with?.["permission-issues"]).toBe("write");
		expect(event?.with?.mode).toBe("check");
		expect(event?.id).toBe("event");
		expect(communication?.with?.mode).toBe("dispatch");
		expect(communication?.env?.SLACK_CHANNEL_ID).toBe(
			workflowExpression("inputs.slack-channel-id"),
		);
		expect(summary?.if).toBe("always()");
		expect(sortedKeys(summary?.env)).toEqual([
			"COMMUNICATION_DIAGNOSTICS",
			"COMMUNICATION_RESULT",
			"DISPATCHED_COUNT",
			"EVENT_DIAGNOSTICS",
			"EVENT_READY",
			"EVENT_RESULT",
			"EVENT_STATE",
			"ISSUE_NUMBER",
			"PLANNED_COUNT",
		]);
		expect(summary?.env?.EVENT_RESULT).toBe(
			workflowExpression("steps.event.outputs.result || '{}'"),
		);
		expect(summary?.env?.EVENT_DIAGNOSTICS).toBe(
			workflowExpression("steps.event.outputs.diagnostics || '[]'"),
		);
		expect(summary?.env?.COMMUNICATION_RESULT).toBe(
			workflowExpression("steps.communications.outputs.result || '{}'"),
		);
		expect(summary?.env?.COMMUNICATION_DIAGNOSTICS).toBe(
			workflowExpression("steps.communications.outputs.diagnostics || '[]'"),
		);
		expect(summary?.run).toContain("sanitize_json");
		expect(summary?.run).toContain("Redacted event result");
		expect(summary?.run).toContain("Redacted event diagnostics");
		expect(summary?.run).toContain("Redacted communication result");
		expect(summary?.run).toContain("Redacted communication diagnostics");
		expect(
			(job.steps ?? []).filter(
				(step: Step) =>
					step.uses === `${automationActionPrefix}event/reconcile` &&
					step.with?.mode === "fix",
			),
		).toEqual([]);
	});

	it("blocks issue-form synchronization when referentials are invalid", async () => {
		// Arrange
		const workflow = await readWorkflow("update-meetup-issue-form");
		const steps = workflow.jobs?.synchronize?.steps ?? [];
		const validation = findStep(
			workflow.jobs?.synchronize ?? {},
			`${automationActionPrefix}referential/validate`,
		);

		// Act
		const enforcement = steps.find(
			(step: Step) => step.name === "Enforce valid referentials",
		);
		const projection = findStep(
			workflow.jobs?.synchronize ?? {},
			`${automationActionPrefix}referential/sync-issue-form`,
		);
		const actual = steps.indexOf(enforcement as Step);

		// Assert
		expect(validation?.id).toBe("referentials");
		expect(enforcement?.if).toBe(
			"steps.referentials.outputs.is-valid != 'true'",
		);
		expect(enforcement?.run).toContain("exit 1");
		expect(actual).toBeLessThan(steps.indexOf(projection as Step));
	});
});
