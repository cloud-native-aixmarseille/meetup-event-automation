import { describe, expect, it } from "vitest";
import {
	type ActionManifest,
	automationActionPrefix,
	readWorkflow,
	readYaml,
	workflowExpression,
} from "./support.js";

const inputs = [
	"meetup-event-url-prefix",
	"community-event-url-prefixes",
	"asset-folder-url-prefix",
] as const;
const actions = [
	"event/reconcile",
	"publication/reconcile-assets",
	"publication/reconcile-feedback",
	"publication/reconcile-meetup",
	"communication/reconcile",
	"communication/reconcile-attention",
];

describe("explicit publication URL configuration", () => {
	it.each(actions)("requires caller-owned prefixes in %s", async (action) => {
		// Arrange
		const path = `actions/${action}/action.yml`;

		// Act
		const manifest = await readYaml<ActionManifest>(path);

		// Assert
		for (const name of inputs) {
			expect(manifest.inputs?.[name]?.required).toBe(true);
			expect(manifest.inputs?.[name]).not.toHaveProperty("default");
		}
	});

	it.each([
		["update-meetup-issue", 5],
		["check-active-meetup-issues", 5],
		["reconcile-meetup-event", 1],
	] as const)(
		"forwards the same required prefixes to every evaluating action in %s",
		async (name, expectedCount) => {
			// Arrange
			const evaluatingActions = actions.map(
				(action) => `${automationActionPrefix}${action}`,
			);

			// Act
			const workflow = await readWorkflow(name);
			const steps = Object.values(workflow.jobs ?? {})
				.flatMap((job) => job.steps ?? [])
				.filter((step) => evaluatingActions.includes(step.uses ?? ""));

			// Assert
			expect(steps).toHaveLength(expectedCount);
			for (const input of inputs) {
				const declaration = workflow.on?.workflow_call?.inputs?.[input];
				expect(declaration).toMatchObject({ required: true, type: "string" });
				expect(declaration).not.toHaveProperty("default");
				for (const step of steps)
					expect(step.with?.[input], step.uses).toBe(
						workflowExpression(`inputs.${input}`),
					);
			}
		},
	);

	it.each([
		"event/list-active",
		"referential/validate",
		"referential/sync-issue-form",
		"referential/sync-speakers",
	])("keeps unrelated URL inputs out of %s", async (action) => {
		// Arrange
		const path = `actions/${action}/action.yml`;

		// Act
		const manifest = await readYaml<ActionManifest>(path);

		// Assert
		for (const input of inputs)
			expect(manifest.inputs).not.toHaveProperty(input);
	});

	it("uses explicit synthetic URL configuration for bundled action exercises", async () => {
		// Arrange
		const localActions = actions.map((action) => `./actions/${action}`);

		// Act
		const workflow = await readWorkflow("__check-actions");
		const steps = Object.values(workflow.jobs ?? {})
			.flatMap((job) => job.steps ?? [])
			.filter((step) => localActions.includes(step.uses ?? ""));

		// Assert
		expect(steps.length).toBeGreaterThan(0);
		for (const step of steps)
			expect(step.with, step.uses).toMatchObject({
				"meetup-event-url-prefix":
					"https://www.meetup.com/example-group/events/",
				"community-event-url-prefixes":
					'["https://community.example.test/events/"]',
				"asset-folder-url-prefix": "https://drive.google.com/drive/folders/",
			});
	});
});
