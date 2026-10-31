import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { readWorkflow, type Workflow, workflowExpression } from "./support.js";

const destinations = [
	{ key: "slack-engineering", provider: "slack" },
	{ key: "slack-community", provider: "slack" },
	{ key: "linkedin", provider: "linkedin" },
];
const configuration = JSON.stringify({ version: 1, destinations });

describe("promotion selection from consumer configuration", () => {
	it.each(
		destinations.flatMap(({ key, provider }) =>
			["announcement", "d7", "d0"].map((purpose) => ({
				target: `${key}:${purpose}`,
				provider,
			})),
		),
	)("selects $target for its $provider generator", async (expected) => {
		// Arrange
		const workflow = await readWorkflow("event-promotion-generate-post");
		const write = vi.fn();

		// Act
		runSelection(workflow, expected.target, configuration, write);

		// Assert
		expect(write).toHaveBeenCalledExactlyOnceWith(
			"/synthetic/output",
			`targets=${JSON.stringify([expected])}\n`,
		);
	});
	it.each(["announcement", "d7", "d0"])(
		"expands *:%s to every configured destination in order",
		async (purpose) => {
			// Arrange
			const workflow = await readWorkflow("event-promotion-generate-post");
			const write = vi.fn();
			const expected = destinations.map(({ key, provider }) => ({
				target: `${key}:${purpose}`,
				provider,
			}));

			// Act
			runSelection(workflow, `*:${purpose}`, configuration, write);

			// Assert
			expect(write).toHaveBeenCalledExactlyOnceWith(
				"/synthetic/output",
				`targets=${JSON.stringify(expected)}\n`,
			);
		},
	);
	it("produces no targets when no destinations are configured", async () => {
		// Arrange
		const workflow = await readWorkflow("event-promotion-generate-post");
		const write = vi.fn();
		const empty = JSON.stringify({ version: 1, destinations: [] });

		// Act
		runSelection(workflow, "*:announcement", empty, write);

		// Assert
		expect(write).toHaveBeenCalledExactlyOnceWith(
			"/synthetic/output",
			"targets=[]\n",
		);
	});
	it.each([
		"",
		"slack-engineering",
		"linkedin:d1",
		"slack-other:d7",
		"linkedin:announcement,d7",
		"*:d1",
		"slack-*:announcement",
	])(
		"rejects unsupported target %s without routing any draft",
		async (target) => {
			// Arrange
			const workflow = await readWorkflow("event-promotion-generate-post");
			const write = vi.fn();

			// Act
			const execute = () =>
				runSelection(workflow, target, configuration, write);

			// Assert
			expect(execute).toThrow("Unsupported promotion draft target");
			expect(write).not.toHaveBeenCalled();
		},
	);
	it.each([
		"not-json",
		"null",
		"{}",
		JSON.stringify({ version: 2, destinations }),
		JSON.stringify({ version: 1, destinations: {} }),
		...[
			null,
			{ key: "invalid\nkey", provider: "slack" },
			{ key: "news", provider: "other" },
			destinations[0],
		].map((destination) =>
			JSON.stringify({
				version: 1,
				destinations: [...destinations, destination],
			}),
		),
		JSON.stringify({
			version: 1,
			destinations: Array.from({ length: 51 }, (_, index) => ({
				key: `channel-${index}`,
				provider: "slack",
			})),
		}),
	])(
		"rejects invalid configuration %s before producing any targets",
		async (invalid) => {
			// Arrange
			const workflow = await readWorkflow("event-promotion-generate-post");
			const write = vi.fn();

			// Act
			const execute = () =>
				runSelection(workflow, "*:announcement", invalid, write);

			// Assert
			expect(execute).toThrow(/Invalid/);
			expect(write).not.toHaveBeenCalled();
		},
	);
});

describe("promotion batch orchestration", () => {
	it("serializes generation, review and reporting under one event lock", async () => {
		// Arrange
		const workflow = await readWorkflow("event-promotion-generate-post");
		const worker = await readWorkflow("__event-promotion-generate-post");

		// Act
		const select = workflow.jobs?.destinations;
		const generate = workflow.jobs?.generate;

		// Assert
		expect(select?.outputs?.targets).toBe(
			workflowExpression("steps.selection.outputs.targets"),
		);
		expect(
			select?.steps?.some((step) => step.uses?.startsWith("$/actions/")),
		).toBe(false);
		expect(generate?.needs).toBe("destinations");
		expect(generate?.if).toBe(
			workflowExpression("needs.destinations.outputs.targets != '[]'"),
		);
		expect(generate?.strategy).toEqual({
			"max-parallel": 1,
			"fail-fast": false,
			matrix: {
				include: workflowExpression(
					"fromJSON(needs.destinations.outputs.targets)",
				),
			},
		});
		expect(generate?.uses).toBe(
			"$/.github/workflows/__event-promotion-generate-post.yml",
		);
		expect(generate?.with?.target).toBe(workflowExpression("matrix.target"));
		expect(generate?.with?.provider).toBe(
			workflowExpression("matrix.provider"),
		);
		expect(workflow.concurrency).toEqual({
			group: workflowExpression(
				"format('meetup-event-{0}-{1}', github.repository_id, inputs.issue-number)",
			),
			"cancel-in-progress": false,
		});
		expect(worker.concurrency).toBeUndefined();
		for (const job of Object.values({ ...workflow.jobs, ...worker.jobs }))
			expect(job.concurrency).toBeUndefined();
	});
});

function runSelection(
	workflow: Workflow,
	target: string,
	content: string,
	write: (path: string, value: string) => void,
) {
	const script = workflow.jobs?.destinations?.steps?.find(
		(step) => step.id === "selection",
	)?.run;
	if (!script?.startsWith("node <<'NODE'\n") || !script.endsWith("\nNODE\n"))
		throw new Error("Missing bounded Node selection script");
	return runInNewContext(
		script.slice("node <<'NODE'\n".length, -"\nNODE\n".length),
		{
			process: {
				env: { REQUESTED_TARGET: target, GITHUB_OUTPUT: "/synthetic/output" },
			},
			require: (name: string) => {
				if (name !== "node:fs") throw new Error("Unexpected script dependency");
				return {
					appendFileSync: write,
					readFileSync: (path: string, encoding: string) => {
						if (path !== ".github/meetup-social.json" || encoding !== "utf8")
							throw new Error("Unexpected configuration source");
						return content;
					},
				};
			},
		},
	);
}
