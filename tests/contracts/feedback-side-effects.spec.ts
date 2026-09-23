import { describe, expect, it } from "vitest";
import {
	type ActionManifest,
	automationActionPrefix,
	findStep,
	managedAuthor,
	readWorkflow,
	readYaml,
	workflowExpression,
} from "./support.js";

describe("feedback workflow safeguards", () => {
	it("requires the Kutt key and link ID on the public action", async () => {
		// Arrange
		const path = "actions/publication/reconcile-feedback/action.yml";

		// Act
		const action = await readYaml<ActionManifest>(path);

		// Assert
		expect(action.inputs?.["kutt-api-key"]?.required).toBe(true);
		expect(action.inputs?.["kutt-link-id"]?.required).toBe(true);
		expect(action.inputs?.["kutt-api-key"]).not.toHaveProperty("default");
		expect(action.inputs?.["kutt-link-id"]).not.toHaveProperty("default");
		expect(action.inputs).not.toHaveProperty("openfeedback-api-key");
	});

	it.each([
		["update-meetup-issue", "manage"],
		["check-active-meetup-issues", "audit"],
	] as const)(
		"requires Kutt configuration under the event lock in %s",
		async (name, jobName) => {
			// Arrange
			const workflow = await readWorkflow(name);
			const job = workflow.jobs?.[jobName] ?? {};

			// Act
			const step = findStep(
				job,
				`${automationActionPrefix}publication/reconcile-feedback`,
			);
			const secrets = workflow.on?.workflow_call?.secrets;

			// Assert
			expect(job.concurrency?.["cancel-in-progress"]).toBe(false);
			expect(secrets).not.toHaveProperty("openfeedback-api-key");
			expect(secrets?.["kutt-api-key"]?.required).toBe(true);
			expect(
				workflow.on?.workflow_call?.inputs?.["kutt-link-id"]?.required,
			).toBe(true);
			expect(step?.with).toMatchObject({
				mode: "fix",
				"managed-comment-author": managedAuthor,
				"kutt-api-key": workflowExpression("secrets.kutt-api-key"),
				"kutt-link-id": workflowExpression("inputs.kutt-link-id"),
			});
		},
	);
});
