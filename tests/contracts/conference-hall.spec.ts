import { describe, expect, it } from "vitest";
import {
	workflowExpression,
	readWorkflow,
	readYaml,
	type ActionManifest,
} from "./support.js";

describe("Conference Hall contracts", () => {
	it("collects proposals without duplicate manual talk or speaker inputs", async () => {
		// Arrange
		const path = "__tests__/meetup-issue-template.yml";

		// Act
		const form = await readYaml<{
			body: { id?: string; attributes?: { value?: string } }[];
		}>(path);

		// Assert
		expect(
			form.body.filter((field) => field.id === "conference_hall_proposals"),
		).toHaveLength(1);
		expect(
			form.body.some(
				(field) =>
					field.id === "agenda" ||
					field.attributes?.value?.includes("<!-- Available speakers -->"),
			),
		).toBe(false);
	});

	it("supplies source settings to bundled-action integration checks", async () => {
		// Arrange
		const workflow = await readWorkflow("__check-actions");

		// Act
		const steps = Object.values(workflow.jobs ?? {})
			.flatMap((job) => job.steps ?? [])
			.filter((step) =>
				/^\.\/actions\/(event\/reconcile|publication\/reconcile-feedback|publication\/reconcile-assets|communication\/reconcile)$/.test(
					step.uses ?? "",
				),
			);

		// Assert
		expect(steps.length).toBeGreaterThan(0);
		for (const step of steps) {
			expect(step.with?.["conference-hall-event"]).toBe("synthetic-cfp");
			expect(step.with?.["conference-hall-api-key"]).toBe("synthetic-key");
		}
	});
	it.each([
		"event/reconcile",
		"publication/reconcile-assets",
		"publication/reconcile-feedback",
		"communication/reconcile",
		"referential/sync-speakers",
	])("requires explicit Conference Hall settings in %s", async (action) => {
		// Arrange
		const path = `actions/${action}/action.yml`;

		// Act
		const manifest = await readYaml<ActionManifest>(path);

		// Assert
		for (const name of ["conference-hall-event", "conference-hall-api-key"]) {
			expect(manifest.inputs?.[name]?.required).toBe(true);
			expect(manifest.inputs?.[name]?.default).toBeUndefined();
		}
	});
	it("guards contact persistence with private scope, a repository lock and a branch-head lease", async () => {
		// Arrange
		const workflow = await readWorkflow("synchronize-conference-hall-speakers");
		// Act
		const job = workflow.jobs?.synchronize;
		const scripts = job?.steps?.map((step) => step.run ?? "").join("\n");
		// Assert
		expect(job?.if).toBe("github.event.repository.private == true");
		expect(job?.concurrency).toEqual({
			group: `meetup-speaker-sync-${workflowExpression("github.repository_id")}`,
			"cancel-in-progress": false,
		});
		expect(scripts).toContain(
			"--force-with-lease=refs/heads/$branch:$EXPECTED_HEAD",
		);
		expect(scripts).toContain('"$EXPECTED_BASE"');
		expect(scripts).not.toContain("--auto");
		expect(scripts).not.toContain("git diff --cached\n");
	});
	it("exposes only the review text consumed by the synchronization workflow", async () => {
		// Arrange
		const path = "actions/referential/sync-speakers/action.yml";
		// Act
		const manifest = await readYaml<ActionManifest>(path);
		// Assert
		expect(Object.keys(manifest.outputs ?? {}).sort()).toEqual([
			"pr-body",
			"pr-title",
		]);
		expect(manifest.inputs?.["conference-hall-api-key"].required).toBe(true);
		expect(manifest.runs?.using).toBe("node24");
	});
	it.each(["update-meetup-issue", "check-active-meetup-issues"])(
		"forwards required source credentials to each refreshing action in %s",
		async (name) => {
			// Arrange
			const workflow = await readWorkflow(name);
			// Act
			const steps = Object.values(workflow.jobs ?? {})
				.flatMap((job) => job.steps ?? [])
				.filter((step) =>
					/\/actions\/(event\/reconcile|publication\/reconcile-feedback|publication\/reconcile-assets|communication\/reconcile)$/.test(
						step.uses ?? "",
					),
				);
			// Assert
			expect(
				workflow.on?.workflow_call?.inputs?.["conference-hall-event"]?.required,
			).toBe(true);
			expect(
				workflow.on?.workflow_call?.inputs?.["conference-hall-event"]?.default,
			).toBeUndefined();
			expect(
				workflow.on?.workflow_call?.secrets?.["conference-hall-api-key"]
					?.required,
			).toBe(true);
			expect(steps).toHaveLength(4);
			for (const step of steps) {
				expect(step.with?.["conference-hall-event"]).toBe(
					workflowExpression("inputs.conference-hall-event"),
				);
				expect(step.with?.["conference-hall-api-key"]).toBe(
					workflowExpression("secrets.conference-hall-api-key"),
				);
			}
		},
	);
});
