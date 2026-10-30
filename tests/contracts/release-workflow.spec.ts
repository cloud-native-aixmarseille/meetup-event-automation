import { describe, expect, it } from "vitest";
import { readWorkflow, workflowExpression } from "./support.js";

describe("release workflow", () => {
	it("requires default-branch CI for weekly and manual releases", async () => {
		// Arrange
		const main = await readWorkflow("__main-ci");

		// Act
		const workflow = await readWorkflow("__release");

		// Assert
		expect(workflow.on).toEqual({
			workflow_dispatch: null,
			schedule: [{ cron: "25 8 * * 1" }],
		});
		expect(workflow.permissions).toEqual({});
		expect(workflow.concurrency).toEqual({
			group: `${workflowExpression("github.workflow")}-${workflowExpression("github.ref")}`,
			"cancel-in-progress": false,
		});
		expect(workflow.jobs?.ci).toEqual({
			...main.jobs?.ci,
			if: "github.ref_type == 'branch' && github.ref_name == github.event.repository.default_branch",
		});
		expect(workflow.jobs?.release).toMatchObject({
			needs: "ci",
			permissions: { contents: "read", "pull-requests": "read" },
		});
		expect(workflow.jobs?.release.if).toBeUndefined();
	});

	it("publishes the planned tag at the validated commit only when changes exist", async () => {
		// Arrange
		const workflow = await readWorkflow("__release");
		const main = await readWorkflow("__main-ci");
		const releaseRevision = main.jobs?.release.uses?.split("@")[1];
		const targetSha = workflowExpression("github.sha");
		const token = workflowExpression("steps.app-token.outputs.token");

		// Act
		const steps = workflow.jobs?.release.steps ?? [];
		const planIndex = steps.findIndex((step) => step.id === "plan-release");
		const createIndex = steps.findIndex((step) =>
			step.uses?.includes("/release/create@"),
		);
		const plan = steps[planIndex];
		const create = steps[createIndex];

		// Assert
		expect(plan).toMatchObject({
			uses: `hoverkraft-tech/ci-github-publish/actions/release/plan@${releaseRevision}`,
			with: { "target-sha": targetSha, "github-token": token },
		});
		expect(create).toMatchObject({
			uses: `hoverkraft-tech/ci-github-publish/actions/release/create@${releaseRevision}`,
			if: "steps.plan-release.outputs.has-changes == 'true' && steps.plan-release.outputs.tag != ''",
			with: {
				tag: workflowExpression("steps.plan-release.outputs.tag"),
				"target-sha": targetSha,
				"github-token": token,
				publish: "true",
			},
		});
		expect(planIndex).toBeLessThan(createIndex);
	});

	it("scopes tag-writing credentials to the current repository", async () => {
		// Arrange
		const workflow = await readWorkflow("__release");

		// Act
		const steps = workflow.jobs?.release.steps ?? [];
		const checkout = steps.find((step) =>
			step.uses?.startsWith("actions/checkout@"),
		);
		const appToken = steps.find((step) => step.id === "app-token");

		// Assert
		expect(checkout?.with).toEqual({ "persist-credentials": false });
		expect(appToken?.uses).toMatch(
			/^actions\/create-github-app-token@[a-f0-9]{40}$/,
		);
		expect(appToken?.with).toEqual({
			"client-id": workflowExpression("vars.CI_BOT_APP_CLIENT_ID"),
			"private-key": workflowExpression("secrets.CI_BOT_APP_PRIVATE_KEY"),
			owner: workflowExpression("github.repository_owner"),
			repositories: workflowExpression("github.event.repository.name"),
			"permission-contents": "write",
			"permission-workflows": "write",
			"permission-pull-requests": "read",
		});
	});

	it("passes an escaped Gemini key only to changelog generation", async () => {
		// Arrange
		const workflow = await readWorkflow("__release");
		const steps = workflow.jobs?.release.steps ?? [];
		const create = steps.find((step) =>
			step.uses?.includes("/release/create@"),
		);
		const syntheticKey = 'synthetic-"key"\\value';

		// Act
		const configuration = JSON.parse(
			String(create?.with?.["changelog-summary"]).replace(
				workflowExpression("toJSON(env.GEMINI_API_KEY)"),
				JSON.stringify(syntheticKey),
			),
		);
		const secretConsumers = steps.filter((step) => step.env?.GEMINI_API_KEY);

		// Assert
		expect(configuration).toEqual({
			llmAuth: syntheticKey,
			llmProvider: "google-genai",
			llmModel: "gemini-3.8-flash",
		});
		expect(create?.env).toEqual({
			GEMINI_API_KEY: workflowExpression("secrets.GEMINI_API_KEY"),
		});
		expect(secretConsumers).toEqual([create]);
		expect(workflow.jobs?.ci.secrets).toBeUndefined();
	});
});
