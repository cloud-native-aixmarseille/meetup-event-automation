import { describe, expect, it } from "vitest";
import { readYaml, type Workflow, workflowExpression } from "./support.js";

describe("event publication workflow", () => {
	it("installs dependencies beside the pinned action before publication", async () => {
		// Arrange
		const runtimeDirectory = workflowExpression(
			"steps.publication-runtime.outputs.runtime-directory",
		);
		const workflow = await readYaml<Workflow>(
			".github/workflows/event-reconcile.yml",
		);

		// Act
		const steps = workflow.jobs?.manage?.steps ?? [];
		const prepare = steps.findIndex(
			(step) => step.id === "publication-runtime",
		);
		const node = steps.findIndex((step) =>
			step.uses?.startsWith(
				"hoverkraft-tech/ci-github-nodejs/actions/setup-node@",
			),
		);
		const browser = steps.findIndex((step) =>
			step.run?.includes("playwright-core install"),
		);
		const python = steps.findIndex((step) => step.run?.includes("pip install"));
		const publication = steps.findIndex((step) => step.id === "publication");

		// Assert
		expect(prepare).toBeGreaterThan(
			steps.findIndex((step) => step.id === "content"),
		);
		expect(node).toBeGreaterThan(prepare);
		expect(browser).toBeGreaterThan(node);
		expect(python).toBeGreaterThan(prepare);
		expect(publication).toBeGreaterThan(python);
		expect(steps.findIndex((step) => step.id === "event")).toBeGreaterThan(
			publication,
		);
		expect(
			steps.findIndex((step) => step.id === "communications"),
		).toBeGreaterThan(publication);
		expect(steps[node].with?.["working-directory"]).toBe(runtimeDirectory);
		expect(steps[browser]["working-directory"]).toBe(runtimeDirectory);
		expect(steps[python]["working-directory"]).toBe(
			`${runtimeDirectory}/packages/adapter/browser-authentication/hcaptcha-captcha-resolver/python`,
		);
		expect(steps.find((step) => step.id === "publication")?.uses).toBe(
			"$/actions/publication/reconcile-event",
		);
	});
	it("serializes all issue writes with the existing event workflows and scopes the App token", async () => {
		// Arrange
		const path = ".github/workflows/event-reconcile.yml";

		// Act
		const workflow = await readYaml<Workflow>(path);
		const job = workflow.jobs?.manage;
		const steps = job?.steps ?? [];
		const token = steps.find((step) => step.id === "app-token");

		// Assert
		expect(workflow.concurrency).toEqual({
			group: workflowExpression(
				"format('meetup-event-{0}-{1}', github.repository_id, inputs.issue-number)",
			),
			"cancel-in-progress": false,
		});
		expect(job?.if).toContain("github.event.action == 'edited'");
		expect(job?.if).toContain(
			"startsWith(github.event.comment.body, '<!-- meetup-organizer-approval:v1 '",
		);
		expect(job?.if).not.toContain('"kind":');
		expect(job?.concurrency).toBeUndefined();
		expect(steps.find((step) => step.id === "publication")?.with).toMatchObject(
			{
				"slack-organizer-channel-id": workflowExpression(
					"inputs.slack-organizer-channel-id",
				),
				"slack-token": workflowExpression("secrets.slack-token"),
				"publication-credentials": workflowExpression(
					"secrets.publication-credentials",
				),
			},
		);
		expect(job?.permissions).toEqual({ contents: "read" });
		expect(token?.with).toMatchObject({
			"permission-contents": "read",
			"permission-issues": "write",
		});
		expect(steps.find((step) => step.id === "publication")?.uses).toBe(
			"$/actions/publication/reconcile-event",
		);
		expect(
			steps.filter((step) =>
				/secrets\.publication-credentials/.test(JSON.stringify(step)),
			),
		).toEqual([steps.find((step) => step.id === "publication")]);
		expect(JSON.stringify(steps)).not.toMatch(/upload-artifact|save-cache/);
	});
	it("installs Chrome and the challenge solver only for Meetup", async () => {
		// Arrange
		const path = ".github/workflows/event-reconcile.yml";
		// Act
		const workflow = await readYaml<Workflow>(path);
		const steps = workflow.jobs?.manage?.steps ?? [];
		const prepare = steps.findIndex(
			(step) => step.id === "publication-runtime",
		);
		const solver = steps.filter(
			(step) =>
				step.uses?.startsWith("actions/setup-python@") ||
				step.run?.includes("pip install") ||
				step.run?.includes("playwright-core install --with-deps chrome"),
		);
		// Assert
		expect(prepare).toBeGreaterThanOrEqual(0);
		expect(steps[prepare].uses).toBe("$/actions/publication/prepare-runtime");
		expect(solver).toHaveLength(3);
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
