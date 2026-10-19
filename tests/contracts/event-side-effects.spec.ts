import { describe, expect, it } from "vitest";
import {
	automationActionPrefix,
	findStep,
	managedAuthor,
	readWorkflow,
	workflowExpression,
} from "./support.js";

describe("event side-effect safeguards", () => {
	it("routes the bounded active-event audit through one-event reconciliation", async () => {
		// Arrange
		const workflow = await readWorkflow("event-reconcile-active");
		// Act
		const job = workflow.jobs?.audit;
		// Assert
		expect(job?.uses).toBe("./.github/workflows/event-reconcile.yml");
		expect(job?.with?.["issue-number"]).toBe(
			workflowExpression("matrix.issue-number"),
		);
		expect(job?.strategy).toMatchObject({
			"max-parallel": 4,
			"fail-fast": false,
		});
		expect(job?.steps).toBeUndefined();
		expect(workflow.concurrency).toBeUndefined();
		expect(job?.concurrency).toBeUndefined();
	});
	it("holds the same issue lock for mutations, reporting and Meetup publication", async () => {
		// Arrange
		const pipeline = await readWorkflow("event-reconcile");
		const publication = await readWorkflow("event-publication-reconcile");
		// Act
		const locks = [
			pipeline.concurrency,
			publication.jobs?.publish?.concurrency,
		];
		// Assert
		for (const lock of locks) {
			expect(lock?.["cancel-in-progress"]).toBe(false);
			expect(lock?.group).toContain("meetup-event-");
			expect(lock?.group).toContain("github.repository_id");
			expect(lock?.group).toContain("inputs.issue-number");
		}
		expect(pipeline.jobs?.manage).not.toHaveProperty("concurrency");
		expect(pipeline.jobs?.report).not.toHaveProperty("concurrency");
	});
	it("uses scoped tokens and derives trusted authors in each effectful job", async () => {
		// Arrange
		const workflow = await readWorkflow("event-reconcile");
		// Act
		const reporting = await readWorkflow("__organizer-reconcile-reporting");
		const jobs = [workflow.jobs?.manage, reporting.jobs?.report];
		// Assert
		for (const job of jobs) {
			const token = job?.steps?.find((step) => step.id === "app-token");
			expect(token?.with).toMatchObject({
				"client-id": workflowExpression("inputs.github-app-client-id"),
				"permission-issues": "write",
				"permission-contents": "read",
			});
			for (const step of job?.steps ?? [])
				if (step.with?.["managed-comment-author"])
					expect(step.with["managed-comment-author"]).toBe(managedAuthor);
		}
	});
	it("keeps authorization and business gating inside the email operation", async () => {
		// Arrange
		const workflow = await readWorkflow("event-reconcile");
		// Act
		const job = workflow.jobs?.manage ?? {};
		const email = findStep(
			job,
			`${automationActionPrefix}communication/reconcile-email`,
		);
		// Assert
		expect(workflow.concurrency?.["cancel-in-progress"]).toBe(false);
		expect(email?.with).not.toHaveProperty("dispatch-authorized");
		expect(email?.with).not.toHaveProperty("mode");
		expect(email).not.toHaveProperty("continue-on-error");
	});
	it("publishes the form only after a completed projection with changes", async () => {
		// Arrange
		const workflow = await readWorkflow("issue-form-reconcile");
		// Act
		const steps = workflow.jobs?.synchronize?.steps ?? [];
		const validation = steps.findIndex((step) => step.id === "referentials");
		const projection = steps.findIndex((step) => step.id === "synchronize");
		const publication = steps.find((step) =>
			step.uses?.startsWith("peter-evans/create-pull-request@"),
		);
		// Assert
		expect(validation).toBeGreaterThanOrEqual(0);
		expect(projection).toBeGreaterThan(validation);
		expect(publication?.if).toContain(
			"steps.synchronize.outputs.completed == 'true'",
		);
		expect(publication?.if).toContain(
			"steps.synchronize.outputs.changed == 'true'",
		);
	});
});
