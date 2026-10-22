import { describe, expect, it } from "vitest";
import * as ActionInterfaceUsage from "./action-interface-usage.js";

describe("operational interface evidence", () => {
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
		const workflows = new Map([
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
			uses: "./.github/workflows/child.yml",
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
		const workflows = new Map([
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
			uses: "./.github/workflows/log.yml",
			with: { value: `\${{ needs.source.outputs.value }}` },
		};
		// Act
		const values = ActionInterfaceUsage.operationalValues(job, workflows);
		// Assert
		expect(values).toEqual([]);
	});
});
