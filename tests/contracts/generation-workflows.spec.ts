import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { AttentionStageInput } from "../../packages/runtime/github-actions/src/attention-stage-input.js";
import { readWorkflow, type Workflow, workflowExpression } from "./support.js";

const preparation = "event-preparation-generate-drafts";
const promotion = "__event-promotion-generate-post";

describe("generation selection at the workflow boundary", () => {
	it.each(
		[
			["title"],
			["description"],
			["cover"],
			["title", "description"],
			["title", "cover"],
			["description", "cover"],
			["title", "description", "cover"],
		].map((targets) => [targets]),
	)("accepts preparation selection %j", async (targets) => {
		// Arrange
		const workflow = await readWorkflow(preparation);
		const write = vi.fn();
		// Act
		runSelection(
			workflow,
			{ REQUESTED_TARGETS: JSON.stringify(targets) },
			write,
		);
		// Assert
		expect(write).toHaveBeenCalledExactlyOnceWith(
			"/synthetic/output",
			`operations=${JSON.stringify(targets)}\n`,
		);
	});
	it.each([
		"",
		"not-json",
		"null",
		"{}",
		'"title"',
		"[]",
		'["title","title"]',
		'["title","unknown"]',
		'["Title"]',
		"[true]",
		'["__proto__"]',
	])(
		"rejects invalid preparation selection %s before producing routing outputs",
		async (selection) => {
			// Arrange
			const workflow = await readWorkflow(preparation);
			const write = vi.fn();
			// Act
			const execute = () =>
				runSelection(workflow, { REQUESTED_TARGETS: selection }, write);
			// Assert
			expect(execute).toThrow(/targets must/);
			expect(write).not.toHaveBeenCalled();
		},
	);
});

describe("generation and reporting effect boundaries", () => {
	it.each([
		[preparation, ["title", "description", "cover"]],
		[promotion, ["slack", "linkedin"]],
	] as const)(
		"keeps review and reporting independent of generator failures in %s",
		async (name, operations) => {
			// Arrange
			const workflow = await readWorkflow(name);
			// Act
			const steps = workflow.jobs?.generate?.steps ?? [];
			const report = workflow.jobs?.report;
			// Assert
			if (name === preparation)
				expect(steps.findIndex((step) => step.id === "selection")).toBeLessThan(
					steps.findIndex((step) => step.id === operations[0]),
				);
			expect(
				steps.findIndex((step) => step.id === "app-token"),
			).toBeGreaterThanOrEqual(0);
			for (const id of operations) {
				const step = steps.find((item) => item.id === id);
				expect(step?.if).toContain("!cancelled()");
				expect(step?.if).toContain("steps.app-token.outcome == 'success'");
				expect(step?.if).toContain("steps.checkout.outcome == 'success'");
				if (name === preparation)
					expect(step?.if).toContain("steps.selection.outcome == 'success'");
				expect(step?.if).toContain(
					name === preparation
						? `contains(fromJSON(steps.selection.outputs.operations), '${id}')`
						: `inputs.provider == '${id}'`,
				);
				expect(step).not.toHaveProperty("continue-on-error");
				for (const other of operations.filter((other) => other !== id))
					expect(step?.if).not.toContain(`steps.${other}.outcome`);
				expect(
					String(workflow.jobs?.generate?.outputs?.[`${id}-report`]),
				).toContain(
					name === preparation
						? `contains(fromJSON(steps.selection.outputs.operations || '[]'), '${id}')`
						: `inputs.provider == '${id}'`,
				);
			}
			expect(steps.at(-1)?.id).toBe("review");
			expect(steps.at(-1)?.if).toContain("!cancelled()");
			expect(report?.uses).toBe(
				"$/.github/workflows/__organizer-reconcile-reporting.yml",
			);
			expect(report?.needs).toBe("generate");
			expect(report?.if).toContain("always()");
			expect(report?.if).toContain(
				"needs.generate.outputs.initialized == 'true'",
			);
			if (name === preparation)
				expect(workflow.concurrency).toEqual({
					group: workflowExpression(
						"format('meetup-event-{0}-{1}', github.repository_id, inputs.issue-number)",
					),
					"cancel-in-progress": false,
				});
			expect(report?.concurrency).toBeUndefined();
		},
	);
	it.each([
		[preparation, ["title"], "title", "success", "[]", "success", true],
		[
			preparation,
			["title", "description", "cover"],
			"cover",
			"failure",
			"",
			"failure",
			false,
		],
		[preparation, ["title", "cover"], "cover", "skipped", "", "unknown", false],
		[
			preparation,
			["description"],
			"description",
			"success",
			"",
			"success",
			false,
		],
		[promotion, ["slack"], "slack", "success", "[]", "success", true],
		[promotion, ["linkedin"], "linkedin", "failure", "[]", "failure", true],
		[preparation, ["title"], "review", "failure", "", "failure", false],
	] as const)(
		"reports selected operations from %s without masking %s / %s / %s",
		async (name, selected, changed, outcome, diagnostics, expectedOutcome, reported) => {
			// Arrange
			const workflow = await readWorkflow(name);
			const states = Object.fromEntries(
				[...selected, "review"].map((id) => [
					id,
					{ outcome: "success", diagnostics: "[]" },
				]),
			);
			states[changed] = { outcome, diagnostics };
			// Act
			const encoded = renderStageResults(workflow, selected, states);
			const actual = new AttentionStageInput().parse(encoded).content;
			// Assert
			expect(JSON.parse(encoded).content).toHaveLength(selected.length + 1);
			expect(actual).toMatchObject({ outcome: expectedOutcome, reported });
		},
	);
});

function runSelection(
	workflow: Workflow,
	env: Record<string, string>,
	write: (path: string, value: string) => void,
) {
	const script = workflow.jobs?.generate?.steps?.find(
		(step) => step.id === "selection",
	)?.run;
	if (!script?.startsWith("node <<'NODE'\n") || !script.endsWith("\nNODE\n"))
		throw new Error("Missing bounded Node selection script");
	return runInNewContext(
		script.slice("node <<'NODE'\n".length, -"\nNODE\n".length),
		{
			process: { env: { ...env, GITHUB_OUTPUT: "/synthetic/output" } },
			require: (name: string) => {
				if (name !== "node:fs") throw new Error("Unexpected script dependency");
				return {
					appendFileSync: write,
				};
			},
		},
	);
}

function renderStageResults(
	workflow: Workflow,
	selected: readonly string[],
	states: Record<string, { outcome: string; diagnostics: string }>,
) {
	const outputs: Record<string, string> = {};
	for (const [name, value] of Object.entries(
		workflow.jobs?.generate?.outputs ?? {},
	)) {
		if (!name.endsWith("-report")) continue;
		const id = name.slice(0, -"-report".length);
		if (!selected.includes(id)) {
			outputs[name] = "";
			continue;
		}
		// Exercise the actual JSON format string and its ordered output references.
		const match = String(value).match(
			/format\('([^']+)', toJSON\(steps\.([\w-]+)\.outcome\), toJSON\(steps\.([\w-]+)\.outputs\.diagnostics\)\)/,
		);
		if (!match) throw new Error("Missing operation evidence format");
		const args = [
			JSON.stringify(states[match[2]].outcome),
			JSON.stringify(states[match[3]].diagnostics),
		];
		outputs[name] = match[1].replace(/\{\{|\}\}|\{(\d+)\}/g, (token, index) =>
			index === undefined ? (token === "{{" ? "{" : "}") : args[Number(index)],
		);
	}
	outputs["review-outcome"] = states.review.outcome;
	outputs["review-diagnostics"] = states.review.diagnostics;
	return String(workflow.jobs?.report?.with?.["stage-results"]).replace(
		/\$\{\{\s*(toJSON\()?needs\.generate\.outputs\.([\w-]+)\)?\s*\}\}/g,
		(_match, json, output) =>
			json ? JSON.stringify(outputs[output]) : outputs[output],
	);
}
