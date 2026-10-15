import { describe, expect, it } from "vitest";
import { automationActionPrefix, readWorkflow, type Step } from "./support.js";
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
			// Assert
			expect(steps.at(-1)).toBe(attention);
			expect(attention?.uses).toBe(
				`${automationActionPrefix}communication/reconcile-attention`,
			);
			expect(attention?.if).toContain("always()");
			expect(attention?.with?.["stage-results"]).toContain(
				"steps.communications.outcome",
			);
			expect(attention?.with?.["stage-results"]).toContain(
				"steps.communications.outputs.diagnostics",
			);
			expect(job.concurrency?.["cancel-in-progress"]).toBe(false);
			expect(communications).not.toHaveProperty("continue-on-error");
			expect(attention).not.toHaveProperty("continue-on-error");
		},
	);
});
