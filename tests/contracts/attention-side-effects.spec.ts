import { describe, expect, it } from "vitest";
import { AttentionStageInput } from "../../packages/runtime/github-actions/src/attention-stage-input.js";
import { automationActionPrefix, readWorkflow } from "./support.js";

describe("organizer reporting composition", () => {
	it("preserves evidence from every independent operation and reports after failed dependencies", async () => {
		// Arrange
		const workflow = await readWorkflow("event-reconcile");
		const reporting = await readWorkflow("__organizer-reconcile-reporting");
		// Act
		const report = workflow.jobs?.report;
		const checklist = reporting.jobs?.report?.steps?.find(
			(step) => step.id === "checklist",
		);
		const attention = reporting.jobs?.report?.steps?.find(
			(step) => step.id === "attention",
		);
		// Assert
		expect(report?.if).toContain("always()");
		expect(report?.uses).toBe(
			"$/.github/workflows/__organizer-reconcile-reporting.yml",
		);
		expect(checklist?.with?.["stage-results"]).toBe(
			`\${{ inputs.stage-results }}`,
		);
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
			"decisions",
			"title",
			"description",
			"content",
			"event",
			"assets",
			"pdf",
			"feedback",
			"communications",
		]) {
			expect(report?.with?.["stage-results"]).toContain(
				`needs.manage.outputs.${stage}-outcome`,
			);
			expect(report?.with?.["stage-results"]).toContain(
				`needs.manage.outputs.${stage}-diagnostics`,
			);
		}
		expect(report?.with?.["stage-results"]).toContain(
			"needs.feedback-link.outputs.diagnostics",
		);
		expect(report?.with?.["stage-results"]).toContain(
			"needs.feedback-link.outputs.outcome",
		);
	});
	it.each(["decisions", "title", "description"])(
		"preserves a failed %s operation when the final content review succeeds",
		async (failed) => {
			// Arrange
			const workflow = await readWorkflow("event-reconcile");
			const template = String(workflow.jobs?.report?.with?.["stage-results"]);
			// Act
			const encoded = template.replace(
				/\$\{\{ toJSON\(needs\.([\w-]+)\.outputs\.([\w-]+)\) \}\}/g,
				(_match, job, output) =>
					JSON.stringify(
						output.endsWith("diagnostics")
							? "[]"
							: job === "manage" && output === `${failed}-outcome`
								? "failure"
								: "success",
					),
			);
			const actual = new AttentionStageInput().parse(encoded).content;
			// Assert
			expect(JSON.parse(encoded).content).toHaveLength(4);
			expect(actual?.outcome).toBe("failure");
		},
	);
	it("allows independent event and mail work after a PDF failure while requiring prepared documents", async () => {
		// Arrange
		const workflow = await readWorkflow("event-reconcile");
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
			expect(step?.if).toContain("steps.checkout.outcome == 'success'");
		}
	});
});
