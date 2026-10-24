import { describe, expect, it } from "vitest";
import { readYaml, type Workflow, workflowExpression } from "./support.js";

describe("event publication workflow", () => {
	it("serializes all issue writes with the existing event workflows and scopes the App token", async () => {
		// Arrange
		const path = ".github/workflows/event-publication-reconcile.yml";

		// Act
		const workflow = await readYaml<Workflow>(path);
		const job = workflow.jobs?.publish;
		const steps = job?.steps ?? [];
		const token = steps.find((step) => step.id === "app-token");

		// Assert
		expect(job?.concurrency).toEqual({
			group: `meetup-event-${workflowExpression("github.repository_id")}-${workflowExpression("inputs.issue-number")}`,
			"cancel-in-progress": false,
		});
		expect(job?.if).toContain("github.event.action == 'edited'");
		expect(job?.if).toContain('"kind":"meetup-publication"');
		expect(job?.if).toContain('"kind":"community-publication"');
		expect(steps.at(-1)?.with).toMatchObject({
			"slack-organizer-channel-id": workflowExpression(
				"inputs.slack-organizer-channel-id",
			),
			"slack-token": workflowExpression("secrets.slack-token"),
			"publication-credentials": workflowExpression(
				"secrets.publication-credentials",
			),
		});
		expect(job?.permissions).toEqual({ contents: "read" });
		expect(token?.with).toMatchObject({
			"permission-contents": "read",
			"permission-issues": "write",
		});
		expect(
			steps.find((step) => step.id === "local-workflow-actions")?.with?.[
				"actions-path"
			],
		).toBe(".");
		expect(steps.at(-1)?.uses).toBe(
			"./../self-workflow/actions/publication/reconcile-event",
		);
		expect(
			steps.filter((step) =>
				/secrets\.publication-credentials/.test(JSON.stringify(step)),
			),
		).toEqual([steps.at(-1)]);
		expect(JSON.stringify(steps)).not.toMatch(/upload-artifact|save-cache/);
	});
	it("installs the challenge solver only when required by the configured adapter collection", async () => {
		// Arrange
		const path = ".github/workflows/event-publication-reconcile.yml";
		// Act
		const workflow = await readYaml<Workflow>(path);
		const steps = workflow.jobs?.publish?.steps ?? [];
		const prepare = steps.findIndex(
			(step) => step.id === "publication-runtime",
		);
		const solver = steps.filter(
			(step) =>
				step.uses?.startsWith("actions/setup-python@") ||
				step.run?.includes("pip install"),
		);
		// Assert
		expect(prepare).toBeGreaterThanOrEqual(0);
		expect(steps[prepare].uses).toBe(
			"./../self-workflow/actions/publication/prepare-runtime",
		);
		expect(solver).toHaveLength(2);
		for (const step of solver) {
			expect(steps.indexOf(step)).toBeGreaterThan(prepare);
			expect(step.if).toBe(
				workflowExpression(
					"steps.publication-runtime.outputs.requires-challenge-solver == 'true'",
				),
			);
		}
		expect(
			workflow.on?.workflow_call?.secrets?.["publication-credentials"],
		).toEqual(expect.objectContaining({ required: true }));
	});
});
