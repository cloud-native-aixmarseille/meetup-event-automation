import { describe, expect, it } from "vitest";
import {
	automationActionPrefix,
	readWorkflow,
	type Step,
	workflowExpression,
} from "./support.js";

describe("organizer attention workflow safeguards", () => {
	it.each([
		["update-meetup-issue", "manage"],
		["check-active-meetup-issues", "audit"],
	])(
		"reconciles final attention after failed dependencies under the lock in %s",
		async (workflowName, jobName) => {
			// Arrange
			const workflow = await readWorkflow(workflowName);
			const job = workflow.jobs?.[jobName] ?? {};

			// Act
			const steps = job.steps ?? [];
			const attention = steps.find((step: Step) => step.id === "attention");
			const communications = steps.find(
				(step: Step) => step.id === "communications",
			);
			const independent = steps.filter((step: Step) =>
				["assets", "event", "reconcile"].includes(step.id ?? ""),
			);

			// Assert
			expect(steps.at(-1)).toBe(attention);
			expect(attention?.uses).toBe(
				`${automationActionPrefix}communication/reconcile-attention`,
			);
			expect(attention?.if).toContain("always()");
			for (const stage of [
				workflowName === "update-meetup-issue" ? "reconcile" : "event",
				"assets",
				"feedback",
				"communications",
			]) {
				expect(attention?.with?.["stage-results"]).toContain(
					`steps.${stage}.outcome`,
				);
				expect(attention?.with?.["stage-results"]).toContain(
					`steps.${stage}.outputs.diagnostics`,
				);
			}
			expect(independent).toHaveLength(2);
			for (const step of independent) {
				expect(step.if).toContain("!cancelled()");
				expect(step.if).toContain("steps.app-token.outcome == 'success'");
				expect(step.if).toContain(
					"steps.local-workflow-actions.outcome == 'success'",
				);
				expect(step).not.toHaveProperty("continue-on-error");
			}
			expect(job.concurrency?.["cancel-in-progress"]).toBe(false);
			expect(communications).not.toHaveProperty("continue-on-error");
			expect(attention).not.toHaveProperty("continue-on-error");
		},
	);

	it.each([
		["update-meetup-issue", "manage"],
		["check-active-meetup-issues", "audit"],
	])(
		"skips dependent mail work when asset completion outputs are absent in %s",
		async (workflowName, jobName) => {
			// Arrange
			const workflow = await readWorkflow(workflowName);
			const steps = workflow.jobs?.[jobName]?.steps ?? [];

			// Act
			const dependent = steps.filter((step: Step) =>
				["mailings-token", "communications"].includes(step.id ?? ""),
			);

			// Assert
			expect(dependent).toHaveLength(2);
			for (const step of dependent) {
				expect(step.if).toBe(
					workflowExpression(
						"steps.assets.outputs.drive-files != '' && steps.assets.outputs.slides-ready != ''",
					),
				);
			}
		},
	);
});
