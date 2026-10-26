import { describe, expect, it } from "vitest";
import * as ActionInterfaceUsage from "./action-interface-usage.js";
import type { Workflow } from "./support.js";

describe("operational interface evidence", () => {
	it.each([
		[".venv/bin/python -m pip install -r requirements.txt", true],
		["echo ready", false],
	])("checks working-directory consumption for %s", (run, consumed) => {
		// Arrange
		const directory = `\${{ steps.runtime.outputs.runtime-directory }}`;
		const job = { steps: [{ run, "working-directory": directory }] };

		// Act
		const values = ActionInterfaceUsage.operationalValues(job);

		// Assert
		expect(values.includes(directory)).toBe(consumed);
	});
	it.each(["./actions/event/reconcile", "$/actions/event/reconcile"])(
		"recognizes owned action input consumers at %s",
		(uses) => {
			// Arrange
			const input = `\${{ inputs.issue-number }}`;
			const job = { steps: [{ uses, with: { "issue-number": input } }] };

			// Act
			const values = ActionInterfaceUsage.operationalValues(job);

			// Assert
			expect(values).toContain(input);
		},
	);
	it.each([
		[[], false],
		[[null, "null", `\${{ null }}`], false],
		[[false, "false", `\${{ false }}`], true],
		[["", " ", `\${{ '' }}`], false],
		[["{}", "[]"], false],
		[[true, "true", `\${{ true }}`], true],
		[[true, "true"], false],
		[["fix", `\${{ 'fix' }}`], true],
	] as const)("rejects unused inputs or constant flags: %j", (values, flag) => {
		// Arrange
		const supplied = [...values];

		// Act
		const problem = ActionInterfaceUsage.inputProblem(supplied, flag);

		// Assert
		expect(problem).toBeDefined();
	});
	it.each([
		[[true, false], true],
		[["fix", "check"], true],
		[[`\${{ steps.assets.outputs.slides-ready }}`], true],
		[["en", "en"], false],
	] as const)("allows variable flags and required data: %j", (values, flag) => {
		// Arrange
		const supplied = [...values];

		// Act
		const problem = ActionInterfaceUsage.inputProblem(supplied, flag);

		// Assert
		expect(problem).toBeUndefined();
	});
	it.each([
		'echo "$VALUE"',
		'gh pr create --verbose "$VALUE" --title "unrelated"',
		'gh pr create --title "unrelated" # "$VALUE"',
		'printf "%s" "$VALUE"',
		'echo "$VALUE" >> "$GITHUB_STEP_SUMMARY"',
		'echo "$VALUE"\ngh pr create --title "unrelated"',
		'printf "%s" "$VALUE" > "$file"\ncat "$file"',
		'# gh pr create --title "$VALUE"',
	])("rejects logging-only shell reads: %s", (script) => {
		// Arrange
		const variable = "VALUE";

		// Act
		const consumed = ActionInterfaceUsage.shellConsumes(script, variable);

		// Assert
		expect(consumed).toBe(false);
	});
	it.each([
		'gh pr create --title "$VALUE"',
		'printf "%s" "$VALUE" > "$file"\ngh pr edit 12 --body-file "$file"',
	])("recognizes published PR content: %s", (script) => {
		// Arrange
		const variable = "VALUE";

		// Act
		const consumed = ActionInterfaceUsage.shellConsumes(script, variable);

		// Assert
		expect(consumed).toBe(true);
	});
	it("ignores debug gates, verbose options, names, and unused environment bindings", () => {
		// Arrange
		const job = {
			if: `\${{ steps.source.outputs.value }}`,
			strategy: { matrix: `\${{ steps.source.outputs.value }}` },
			steps: [
				{
					name: `\${{ steps.source.outputs.value }}`,
					if: `\${{ steps.source.outputs.value }}`,
					env: { VALUE: `\${{ steps.source.outputs.value }}` },
					run: 'echo "$VALUE"',
				},
				{
					uses: "vendor/debug@sha",
					with: { verbose: `\${{ steps.source.outputs.value }}` },
				},
			],
		};

		// Act
		const consumers = ActionInterfaceUsage.operationalValues(job);

		// Assert
		expect(consumers).toEqual([]);
	});
});

describe("reusable workflow data flow", () => {
	it("traces only inputs consumed by a called workflow into a real action", () => {
		// Arrange
		const workflows = new Map<string, Workflow>([
			[
				"child.yml",
				{
					jobs: {
						run: {
							steps: [
								{
									uses: "./actions/event/reconcile",
									with: { "issue-number": `\${{ inputs.issue-number }}` },
								},
							],
						},
					},
				},
			],
		]);
		const job = {
			uses: "$/.github/workflows/child.yml",
			strategy: { matrix: `\${{ needs.list.outputs.issues }}` },
			with: {
				"issue-number": `\${{ matrix.issue }}`,
				unused: `\${{ needs.source.outputs.unused }}`,
			},
		};
		// Act
		const values = ActionInterfaceUsage.operationalValues(job, workflows);
		// Assert
		expect(values).toContain(`\${{ needs.list.outputs.issues }}`);
		expect(values).toContain(`\${{ matrix.issue }}`);
		expect(values).not.toContain(`\${{ needs.source.outputs.unused }}`);
	});
	it("does not treat a called logging-only workflow as an operational consumer", () => {
		// Arrange
		const workflows = new Map<string, Workflow>([
			[
				"log.yml",
				{
					jobs: {
						log: {
							steps: [
								{
									run: 'echo "$VALUE"',
									env: { VALUE: `\${{ inputs.value }}` },
								},
							],
						},
					},
				},
			],
		]);
		const job = {
			uses: "$/.github/workflows/log.yml",
			with: { value: `\${{ needs.source.outputs.value }}` },
		};
		// Act
		const values = ActionInterfaceUsage.operationalValues(job, workflows);
		// Assert
		expect(values).toEqual([]);
	});
});

describe("internal workflow reachability", () => {
	it("includes nested operational helpers while excluding isolated CI exercises", () => {
		// Arrange
		const workflows = new Map<string, Workflow>([
			[
				"event.yml",
				{ jobs: { prepare: { uses: "$/.github/workflows/__prepare.yml" } } },
			],
			[
				"__prepare.yml",
				{ jobs: { report: { uses: "$/.github/workflows/__report.yml" } } },
			],
			[
				"__report.yml",
				{ jobs: { cycle: { uses: "$/.github/workflows/__prepare.yml" } } },
			],
			[
				"__check-actions.yml",
				{ jobs: { exercise: { uses: "$/.github/workflows/__test.yml" } } },
			],
			["__test.yml", { jobs: {} }],
		]);
		// Act
		const reachable = ActionInterfaceUsage.operationalWorkflows(workflows);
		// Assert
		expect([...reachable]).toEqual([
			"event.yml",
			"__prepare.yml",
			"__report.yml",
		]);
	});
	it.each([true, false])(
		"traces forwarded internal outputs only to real effects: %s",
		(effectful) => {
			// Arrange
			const workflows = new Map<string, Workflow>([
				[
					"event.yml",
					{ jobs: { run: { uses: "$/.github/workflows/__core.yml" } } },
				],
				[
					"__core.yml",
					{
						jobs: {
							link: { uses: "$/.github/workflows/day.yml" },
							report: {
								uses: "$/.github/workflows/__report.yml",
								with: { value: `\${{ needs.link.outputs.outcome }}` },
							},
						},
					},
				],
				[
					"day.yml",
					{
						on: {
							workflow_call: {
								outputs: {
									outcome: { value: `\${{ jobs.link.outputs.outcome }}` },
								},
							},
						},
						jobs: { link: { uses: "$/.github/workflows/__link.yml" } },
					},
				],
				["__link.yml", { jobs: {} }],
				[
					"__report.yml",
					{
						jobs: {
							report: {
								steps: effectful
									? [
											{
												uses: "./actions/organizer/reconcile-checklist",
												with: { value: `\${{ inputs.value }}` },
											},
										]
									: [
											{
												run: 'echo "$VALUE"',
												env: { VALUE: `\${{ inputs.value }}` },
											},
										],
							},
						},
					},
				],
				[
					"__check-actions.yml",
					{
						jobs: {
							link: { uses: "$/.github/workflows/__link.yml" },
							fake: {
								steps: [
									{
										uses: "./actions/organizer/reconcile-checklist",
										with: { value: `\${{ needs.link.outputs.outcome }}` },
									},
								],
							},
						},
					},
				],
			]);
			// Act
			const consumed = ActionInterfaceUsage.workflowOutputConsumed(
				workflows,
				"__link.yml",
				"outcome",
			);
			// Assert
			expect(consumed).toBe(effectful);
		},
	);
});

describe("conditional runtime installation", () => {
	it.each([
		{
			run: "python -m venv .venv\n.venv/bin/python -m pip install --disable-pip-version-check -r requirements.txt",
			consumed: true,
		},
		{
			run: 'echo ".venv/bin/python -m pip install -r requirements.txt"',
			consumed: false,
		},
		{
			run: "# .venv/bin/python -m pip install -r requirements.txt",
			consumed: false,
		},
		{ run: ".venv/bin/python -m pip --version", consumed: false },
	])(
		"recognizes dependency installation effects: $run",
		({ run, consumed }) => {
			// Arrange
			const condition = `\${{ steps.runtime.outputs.requires-challenge-solver == 'true' }}`;
			const job = { steps: [{ if: condition, run }] };
			// Act
			const values = ActionInterfaceUsage.operationalValues(job);
			// Assert
			expect(values.includes(condition)).toBe(consumed);
		},
	);
});
