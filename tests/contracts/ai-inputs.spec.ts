import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	type ActionManifest,
	readYaml,
	root,
	type Workflow,
	workflowExpression,
} from "./support.js";

const aiInputs = ["ai-api-key", "ai-model", "ai-provider"];

async function actionManifests() {
	const paths = (
		await readdir(join(root, "actions"), { recursive: true })
	).filter((path) => path.endsWith("/action.yml"));
	return Promise.all(
		paths.map(async (path) => ({
			action: path.replace(/\/action.yml$/, ""),
			manifest: await readYaml<ActionManifest>(`actions/${path}`),
		})),
	);
}

describe("shared AI action configuration", () => {
	it("requires the complete common contract in every action declaring AI inputs", async () => {
		// Arrange
		const manifests = await actionManifests();

		// Act
		const consumers = manifests.filter(({ manifest }) =>
			Object.keys(manifest.inputs ?? {}).some((name) => name.startsWith("ai-")),
		);

		// Assert
		expect(consumers.map(({ action }) => action)).toContain(
			"publication/reconcile-meetup",
		);
		for (const { action, manifest } of consumers) {
			const names = Object.keys(manifest.inputs ?? {}).filter((name) =>
				name.startsWith("ai-"),
			);
			expect(names.sort(), action).toEqual(aiInputs);
			for (const name of aiInputs) {
				expect(manifest.inputs?.[name], `${action}: ${name}`).toMatchObject({
					required: true,
				});
				expect(
					manifest.inputs?.[name],
					`${action}: ${name}`,
				).not.toHaveProperty("default");
			}
		}
	});

	it.each([
		"event/list-active",
		"event/reconcile",
		"publication/reconcile-assets",
		"publication/reconcile-feedback",
		"communication/reconcile",
		"communication/reconcile-attention",
		"referential/validate",
		"referential/sync-issue-form",
		"referential/sync-speakers",
	])("does not require unused AI configuration in %s", async (action) => {
		// Arrange
		const path = `actions/${action}/action.yml`;

		// Act
		const manifest = await readYaml<ActionManifest>(path);
		const names = Object.keys(manifest.inputs ?? {}).filter((name) =>
			name.startsWith("ai-"),
		);

		// Assert
		expect(names).toEqual([]);
	});

	it("forwards explicit provider and model inputs and confines the API secret to AI steps", async () => {
		// Arrange
		const manifests = await actionManifests();
		const consumers = new Set(
			manifests
				.filter(({ manifest }) =>
					Object.keys(manifest.inputs ?? {}).some((name) =>
						name.startsWith("ai-"),
					),
				)
				.map(({ action }) => action),
		);
		const paths = (await readdir(join(root, ".github/workflows"))).filter(
			(path) => path.endsWith(".yml") && !path.startsWith("__"),
		);

		// Act
		const workflows = await Promise.all(
			paths.map(async (path) => ({
				path,
				workflow: await readYaml<Workflow>(`.github/workflows/${path}`),
			})),
		);

		// Assert
		for (const { path, workflow } of workflows) {
			const steps = Object.values(workflow.jobs ?? {}).flatMap(
				(job) => job.steps ?? [],
			);
			const aiSteps = steps.filter((step) => {
				const action = step.uses?.match(
					/^\.\/(?:\.\.\/self-workflow\/)?actions\/(.+)$/,
				)?.[1];
				return action !== undefined && consumers.has(action);
			});
			const contract = workflow.on?.workflow_call;
			const inputs = Object.keys(contract?.inputs ?? {}).filter((name) =>
				name.startsWith("ai-"),
			);
			const secrets = Object.keys(contract?.secrets ?? {}).filter((name) =>
				name.startsWith("ai-"),
			);
			if (aiSteps.length === 0) {
				expect([...inputs, ...secrets], path).toEqual([]);
				continue;
			}
			expect(inputs.sort(), path).toEqual(["ai-model", "ai-provider"]);
			expect(secrets, path).toEqual(["ai-api-key"]);
			for (const name of inputs) {
				expect(contract?.inputs?.[name], path).toMatchObject({
					required: true,
					type: "string",
				});
				expect(contract?.inputs?.[name], path).not.toHaveProperty("default");
			}
			expect(contract?.secrets?.["ai-api-key"], path).toMatchObject({
				required: true,
			});
			for (const step of aiSteps)
				expect(step.with, path).toMatchObject({
					"ai-provider": workflowExpression("inputs.ai-provider"),
					"ai-model": workflowExpression("inputs.ai-model"),
					"ai-api-key": workflowExpression("secrets.ai-api-key"),
				});
			for (const step of steps.filter((step) => !aiSteps.includes(step)))
				expect(JSON.stringify(step), path).not.toContain("secrets.ai-api-key");
			for (const { steps: _steps, ...settings } of Object.values(
				workflow.jobs ?? {},
			))
				expect(JSON.stringify(settings), path).not.toContain(
					"secrets.ai-api-key",
				);
		}
	});
});
