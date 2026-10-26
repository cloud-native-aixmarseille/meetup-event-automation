import { describe, expect, it } from "vitest";
import {
	automationActionPrefix,
	readWorkflow,
	workflowExpression,
} from "./support.js";

describe("feedback effect boundaries", () => {
	it("selects the shared link only after an event run has initialized", async () => {
		// Arrange
		const workflow = await readWorkflow("event-reconcile");
		// Act
		const job = workflow.jobs?.["feedback-link"];
		// Assert
		expect(job?.uses).toBe(
			"$/.github/workflows/__feedback-reconcile-short-link.yml",
		);
		expect(job?.needs).toBe("manage");
		expect(job?.if).toContain("!cancelled()");
		expect(job?.if).toContain("needs.manage.outputs.initialized == 'true'");
	});
	it("reconciles event feedback without credentials for the shared link", async () => {
		// Arrange
		const workflow = await readWorkflow("event-reconcile");
		// Act
		const step = workflow.jobs?.manage?.steps?.find(
			(item) => item.id === "feedback",
		);
		// Assert
		expect(step?.uses).toBe(
			`${automationActionPrefix}feedback/reconcile-event`,
		);
		expect(step?.with?.["openfeedback-api-key"]).toBe(
			workflowExpression("secrets.openfeedback-api-key"),
		);
		expect(step?.with).not.toHaveProperty("kutt-api-key");
	});
	it("serializes repository-wide link selection and reports its outcome", async () => {
		// Arrange
		const workflow = await readWorkflow("__feedback-reconcile-short-link");
		// Act
		const job = workflow.jobs?.reconcile;
		const step = job?.steps?.find((item) => item.id === "link");
		// Assert
		expect(job?.concurrency?.["cancel-in-progress"]).toBe(false);
		expect(job?.concurrency?.queue).toBe("max");
		expect(job?.concurrency?.group).toContain("github.repository_id");
		expect(job?.concurrency?.group).toContain("inputs.kutt-link-id");
		expect(job?.concurrency?.group).not.toContain("issue-number");
		expect(step?.uses).toBe(
			`${automationActionPrefix}feedback/reconcile-short-link`,
		);
		for (const input of ["kutt-base-url", "kutt-link-id"])
			expect(step?.with?.[input]).toBe(workflowExpression(`inputs.${input}`));
		expect(step?.with?.["kutt-api-key"]).toBe(
			workflowExpression("secrets.kutt-api-key"),
		);
		expect(step?.with).not.toHaveProperty("conference-hall-api-key");
		expect(step?.with).not.toHaveProperty("openfeedback-api-key");
		expect(job?.outputs).toEqual({
			diagnostics: workflowExpression("steps.link.outputs.diagnostics"),
			outcome: workflowExpression("steps.link.outcome"),
		});
	});
});
