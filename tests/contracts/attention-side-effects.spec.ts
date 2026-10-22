import { describe, expect, it } from "vitest";
import { automationActionPrefix, readWorkflow } from "./support.js";

describe("organizer reporting composition", () => {
	it("preserves evidence from every independent operation and reports after failed dependencies", async () => {
		// Arrange
		const workflow = await readWorkflow("reconcile-meetup");
		// Act
		const report = workflow.jobs?.report;
		const checklist = report?.steps?.find((step) => step.id === "checklist");
		const attention = report?.steps?.find((step) => step.id === "attention");
		// Assert
		expect(report?.if).toContain("always()");
		expect(report?.needs).toEqual(["manage", "feedback-link"]);
		expect(checklist?.uses).toBe(
			`${automationActionPrefix}organizer/reconcile-checklist`,
		);
		expect(attention?.uses).toBe(
			`${automationActionPrefix}organizer/reconcile-attention`,
		);
		expect(attention?.if).toContain("steps.checklist.outcome == 'success'");
		expect(attention?.with?.["stage-results"]).toBe(
			checklist?.with?.["stage-results"],
		);
		for (const stage of [
			"event",
			"assets",
			"pdf",
			"feedback",
			"communications",
		]) {
			expect(checklist?.with?.["stage-results"]).toContain(
				`needs.manage.outputs.${stage}-outcome`,
			);
			expect(checklist?.with?.["stage-results"]).toContain(
				`needs.manage.outputs.${stage}-diagnostics`,
			);
		}
		expect(checklist?.with?.["stage-results"]).toContain(
			"needs.feedback-link.outputs.diagnostics",
		);
		expect(checklist?.with?.["stage-results"]).toContain(
			"needs.feedback-link.outputs.outcome",
		);
	});
	it("allows independent event and mail work after a PDF failure while requiring prepared documents", async () => {
		// Arrange
		const workflow = await readWorkflow("reconcile-meetup");
		// Act
		const steps = workflow.jobs?.manage?.steps ?? [];
		const dependent = steps.filter((step) =>
			["mailings-token", "communications"].includes(step.id ?? ""),
		);
		// Assert
		expect(dependent).toHaveLength(2);
		for (const step of dependent) {
			expect(step.if).toContain("!cancelled()");
			expect(step.if).toContain("steps.assets.outputs.drive-files != ''");
			expect(step.if).toContain("steps.assets.outputs.slides-ready != ''");
			expect(step.if).not.toContain("steps.pdf");
			expect(step).not.toHaveProperty("continue-on-error");
		}
		for (const id of ["assets", "event"]) {
			const step = steps.find((item) => item.id === id);
			expect(step?.if).toContain("!cancelled()");
			expect(step?.if).toContain("steps.app-token.outcome == 'success'");
			expect(step?.if).toContain(
				"steps.local-workflow-actions.outcome == 'success'",
			);
		}
	});
});
