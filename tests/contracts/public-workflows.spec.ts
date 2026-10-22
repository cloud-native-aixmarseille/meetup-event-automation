import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	automationActionPrefix,
	localWorkflowActionsRef,
	readWorkflow,
	readYaml,
	root,
	type Workflow,
	workflowExpression,
} from "./support.js";

const actionWiring = {
	"reconcile-meetup": {
		manage: [
			"feedback/reconcile-event",
			"assets/reconcile-documents",
			"assets/reconcile-slides-pdf",
			"event/reconcile",
			"communication/reconcile-email",
		],
		report: ["organizer/reconcile-checklist", "organizer/reconcile-attention"],
	},
	"reconcile-feedback-link": { reconcile: ["feedback/reconcile-short-link"] },
	"check-active-meetup-issues": { list: ["event/list-active"] },
	"update-meetup-issue-form": {
		synchronize: ["referential/validate", "issue-form/reconcile"],
	},
	"check-meetup-referentials-and-issue-form": {
		validate: ["referential/validate", "issue-form/reconcile"],
	},
	"reconcile-speakers": {
		synchronize: ["referential/reconcile-speakers", "issue-form/reconcile"],
	},
	"reconcile-event-publication": { publish: ["publication/reconcile-event"] },
};

describe("public reusable workflow contracts", () => {
	it.each(Object.entries(actionWiring))(
		"loads scoped actions from the workflow revision in %s",
		async (name, jobs) => {
			// Arrange
			const workflow = await readWorkflow(name);
			// Act
			const configured = Object.entries(jobs).map(([id, expected]) => ({
				expected,
				steps: workflow.jobs?.[id]?.steps ?? [],
			}));
			// Assert
			for (const { expected, steps } of configured) {
				const loader = steps.findIndex(
					(step) =>
						step.uses === localWorkflowActionsRef &&
						step.with?.["actions-path"] ===
							(name === "reconcile-event-publication" ? "." : "actions"),
				);
				const actions = steps.filter((step) =>
					step.uses?.startsWith(automationActionPrefix),
				);
				expect(actions.map((step) => step.uses)).toEqual(
					expected.map((path) => automationActionPrefix + path),
				);
				expect(loader).toBeGreaterThanOrEqual(0);
				expect(loader).toBeLessThan(steps.indexOf(actions[0]));
			}
		},
	);
	it("passes every nested workflow input and secret explicitly", async () => {
		// Arrange
		const files = (await readdir(join(root, ".github/workflows"))).filter(
			(file) => file.endsWith(".yml") && !file.startsWith("__"),
		);
		const workflows = new Map(
			await Promise.all(
				files.map(
					async (file) =>
						[
							file,
							await readYaml<Workflow>(`.github/workflows/${file}`),
						] as const,
				),
			),
		);
		// Act
		const calls = [...workflows.values()]
			.flatMap((workflow) => Object.values(workflow.jobs ?? {}))
			.filter((job) => job.uses?.startsWith("./.github/workflows/"));
		// Assert
		expect(calls.length).toBeGreaterThan(0);
		for (const call of calls) {
			const target = workflows.get(call.uses?.split("/").at(-1) ?? "");
			expect(target).toBeDefined();
			expect(Object.keys(call.with ?? {}).sort()).toEqual(
				Object.keys(target?.on?.workflow_call?.inputs ?? {}).sort(),
			);
			expect(Object.keys(call.secrets ?? {}).sort()).toEqual(
				Object.keys(target?.on?.workflow_call?.secrets ?? {}).sort(),
			);
			expect(call.permissions).toEqual({ contents: "read" });
		}
	});
	it("provides prepared slides to email while keeping PDF reconciliation independent", async () => {
		// Arrange
		const workflow = await readWorkflow("reconcile-meetup");
		// Act
		const steps = workflow.jobs?.manage?.steps ?? [];
		const documents = steps.findIndex((step) => step.id === "assets");
		const pdf = steps.find((step) => step.id === "pdf");
		const email = steps.find((step) => step.id === "communications");
		// Assert
		expect(documents).toBeGreaterThanOrEqual(0);
		expect(
			steps.findIndex((step) => step.id === "communications"),
		).toBeGreaterThan(documents);
		expect(pdf?.with?.["pdf-source"]).toBe(
			workflowExpression("steps.assets.outputs.pdf-source"),
		);
		expect(email?.with?.["slides-ready"]).toBe(
			workflowExpression("steps.assets.outputs.slides-ready"),
		);
		expect(email?.with?.["slides-url"]).toBe(
			workflowExpression(
				"fromJSON(steps.assets.outputs.drive-files)['slides-link']",
			),
		);
		expect(email?.if).not.toContain("steps.pdf");
	});
	it("mints a revocable mailings-only token immediately before email reconciliation", async () => {
		// Arrange
		const workflow = await readWorkflow("reconcile-meetup");
		// Act
		const steps = workflow.jobs?.manage?.steps ?? [];
		const token = steps.find((step) => step.id === "mailings-token");
		const email = steps.find((step) => step.id === "communications");
		// Assert
		expect(token?.with).toEqual({
			"client-id": workflowExpression("inputs.github-app-client-id"),
			"private-key": workflowExpression("secrets.github-app-private-key"),
			owner: workflowExpression("github.repository_owner"),
			repositories: "mailings",
			"permission-contents": "write",
		});
		expect(email?.with?.["mailings-token"]).toBe(
			workflowExpression("steps.mailings-token.outputs.token"),
		);
		expect(email?.with?.["slack-token"]).toBe(
			workflowExpression("secrets.slack-token"),
		);
		expect(email?.with?.["slack-organizer-channel-id"]).toBe(
			workflowExpression("inputs.slack-organizer-channel-id"),
		);
		expect(steps.findIndex((step) => step.id === "communications")).toBe(
			steps.findIndex((step) => step.id === "mailings-token") + 1,
		);
		expect(JSON.stringify(workflow.jobs?.manage?.outputs)).not.toContain(
			"mailings-token",
		);
	});
	it("pins external dependencies and prevents persisted checkout credentials", async () => {
		// Arrange
		const files = (await readdir(join(root, ".github/workflows"))).filter(
			(file) => file.endsWith(".yml"),
		);
		// Act
		const workflows = await Promise.all(
			files.map((file) => readYaml<Workflow>(`.github/workflows/${file}`)),
		);
		const jobs = workflows.flatMap((workflow) =>
			Object.values(workflow.jobs ?? {}),
		);
		const uses = jobs
			.flatMap((job) => [
				job.uses,
				...(job.steps ?? []).map((step) => step.uses),
			])
			.filter(
				(value): value is string => Boolean(value) && !value?.startsWith("./"),
			);
		// Assert
		expect(uses.length).toBeGreaterThan(0);
		for (const value of uses) expect(value).toMatch(/^[^@\s]+@[0-9a-f]{40}$/);
		for (const step of jobs.flatMap((job) => job.steps ?? []))
			if (step.uses?.startsWith("actions/checkout@"))
				expect(step.with?.["persist-credentials"]).toBe(false);
	});
	it("uses required client IDs for every installation token", async () => {
		// Arrange
		const files = (await readdir(join(root, ".github/workflows"))).filter(
			(file) => file.endsWith(".yml") && !file.startsWith("__"),
		);
		// Act
		const workflows = await Promise.all(
			files.map((file) => readYaml<Workflow>(`.github/workflows/${file}`)),
		);
		// Assert
		for (const workflow of workflows)
			for (const token of Object.values(workflow.jobs ?? {})
				.flatMap((job) => job.steps ?? [])
				.filter((step) =>
					step.uses?.startsWith("actions/create-github-app-token@"),
				)) {
				expect(
					workflow.on?.workflow_call?.inputs?.["github-app-client-id"],
				).toMatchObject({ required: true, type: "string" });
				expect(token.with?.["client-id"]).toBe(
					workflowExpression("inputs.github-app-client-id"),
				);
				expect(token.with).not.toHaveProperty("app-id");
			}
	});
	it("accepts human edits to trusted bot requests only on open issues", async () => {
		// Arrange
		const workflow = await readWorkflow("update-meetup-issue");
		// Act
		const guard = workflow.jobs?.manage?.if ?? "";
		// Assert
		for (const condition of [
			"!github.event.issue.pull_request",
			"github.event.issue.state == 'open'",
			"github.event_name != 'issue_comment'",
			"github.event.action == 'edited'",
			"github.event.sender.type == 'User'",
			"github.event.comment.user.type == 'Bot'",
			"startsWith(github.event.comment.body, '<!-- meetup-organizer-approval:v1 ')",
		])
			expect(guard).toContain(condition);
	});
});
