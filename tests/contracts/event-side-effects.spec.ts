import { describe, expect, it } from "vitest";
import {
	type ActionManifest,
	type Step,
	automationActionPrefix,
	findStep,
	managedAuthor,
	readWorkflow,
	readYaml,
	sortedKeys,
	workflowExpression,
} from "./support.js";

describe("event side-effect safeguards", () => {
	it("keeps asset mutations optional and protected by the shared event lock", async () => {
		const action = await readYaml<ActionManifest>(
			"actions/publication/reconcile-assets/action.yml",
		);
		expect(action.inputs?.["google-credentials"]?.required).toBe(false);
		for (const [name, jobName] of [
			["update-meetup-issue", "manage"],
			["check-active-meetup-issues", "audit"],
		] as const) {
			const workflow = await readWorkflow(name);
			const job = workflow.jobs?.[jobName] ?? {};
			const step = findStep(
				job,
				`${automationActionPrefix}publication/reconcile-assets`,
			);
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
		}
	});

	it("shares one non-cancelling event lock between issue and audit paths", async () => {
		const manage = await readWorkflow("update-meetup-issue");
		const audit = await readWorkflow("check-active-meetup-issues");
		const manageLock = manage.jobs?.manage.concurrency;
		const auditLock = audit.jobs?.audit.concurrency;

		expect(manageLock).toEqual({
			"cancel-in-progress": false,
			group: `meetup-event-${workflowExpression("github.repository_id")}-${workflowExpression("github.event.issue.number")}`,
		});
		expect(auditLock).toEqual({
			"cancel-in-progress": false,
			group: `meetup-event-${workflowExpression("github.repository_id")}-${workflowExpression("matrix.issue-number")}`,
		});
	});

	it("derives managed authors from the scoped application token", async () => {
		for (const [workflowName, jobName] of [
			["update-meetup-issue", "manage"],
			["check-active-meetup-issues", "audit"],
		] as const) {
			const workflow = await readWorkflow(workflowName);
			const job = workflow.jobs?.[jobName] ?? {};
			const appTokenIndex = (job.steps ?? []).findIndex(
				(step: Step) =>
					step.id === "app-token" &&
					step.uses?.startsWith("actions/create-github-app-token@"),
			);
			for (const action of ["event/reconcile", "communication/reconcile"]) {
				const stepIndex = (job.steps ?? []).findIndex(
					(step: Step) => step.uses === `${automationActionPrefix}${action}`,
				);
				expect(stepIndex).toBeGreaterThan(appTokenIndex);
				expect(job.steps?.[stepIndex].with?.["managed-comment-author"]).toBe(
					managedAuthor,
				);
			}
			expect(workflow.on?.workflow_call?.inputs ?? {}).not.toHaveProperty(
				"managed-comment-author",
			);
		}
	});

	it("authorizes dispatch only in the two officially locked jobs", async () => {
		const expected = [
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
		] as const;

		for (const item of expected) {
			const workflow = await readWorkflow(item.workflow);
			const job = workflow.jobs?.[item.job] ?? {};
			const step = findStep(
				job,
				`${automationActionPrefix}communication/reconcile`,
			);
			expect(job.concurrency?.["cancel-in-progress"]).toBe(false);
			expect(step?.with?.mode).toBe(item.mode);
			expect(step?.with?.["dispatch-authorized"]).toBe("true");
		}
	});

	it("keeps scheduled audits code-owned and config-gated", async () => {
		const workflow = await readWorkflow("check-active-meetup-issues");
		const job = workflow.jobs?.audit ?? {};
		const token = (job.steps ?? []).find(
			(step: Step) => step.id === "app-token",
		);
		const event = findStep(job, `${automationActionPrefix}event/reconcile`);
		const communication = findStep(
			job,
			`${automationActionPrefix}communication/reconcile`,
		);

		expect(sortedKeys(workflow.on?.workflow_call?.inputs)).toEqual([
			"github-app-id",
			"google-drive-meetup-folder-id",
			"google-drive-meetup-template-folder-id",
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
		const summary = (job.steps ?? []).find(
			(step: Step) => step.name === "Add redacted audit summary",
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
		const workflow = await readWorkflow("update-meetup-issue-form");
		const steps = workflow.jobs?.synchronize?.steps ?? [];
		const validation = findStep(
			workflow.jobs?.synchronize ?? {},
			`${automationActionPrefix}referential/validate`,
		);
		const enforcement = steps.find(
			(step: Step) => step.name === "Enforce valid referentials",
		);
		const projection = findStep(
			workflow.jobs?.synchronize ?? {},
			`${automationActionPrefix}referential/sync-issue-form`,
		);

		expect(validation?.id).toBe("referentials");
		expect(enforcement?.if).toBe(
			"steps.referentials.outputs.is-valid != 'true'",
		);
		expect(enforcement?.run).toContain("exit 1");
		expect(steps.indexOf(enforcement as Step)).toBeLessThan(
			steps.indexOf(projection as Step),
		);
	});
});
