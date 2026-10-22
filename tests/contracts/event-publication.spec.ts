import { describe, expect, it } from "vitest";
import { readYaml, type Workflow, workflowExpression } from "./support.js";

describe("event publication workflow", () => {
	it("serializes all issue writes with the existing event workflows and scopes the App token", async () => {
		// Arrange
		const path = ".github/workflows/reconcile-event-publication.yml";

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
		expect(steps.at(-1)?.with).toMatchObject({
			"slack-organizer-channel-id": workflowExpression(
				"inputs.slack-organizer-channel-id",
			),
			"slack-token": workflowExpression("secrets.slack-token"),
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
				/secrets\.(meetup-|ai-api-key)/.test(JSON.stringify(step)),
			),
		).toEqual([steps.at(-1)]);
		expect(JSON.stringify(steps)).not.toMatch(/upload-artifact|save-cache/);
	});
});
