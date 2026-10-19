import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";
import * as ActionInterfaceUsage from "../../scripts/action-interface-usage.js";
import {
	type ActionManifest,
	type Workflow,
	readYaml,
	root,
} from "./support.js";

describe("minimal explicit action interfaces", () => {
	it("enforces interface checks in local and CI lint", async () => {
		// Arrange
		const path = join(root, "package.json");
		// Act
		const { scripts } = JSON.parse(await readFile(path, "utf8"));
		// Assert
		for (const name of ["lint", "lint:ci"])
			expect(scripts[name].split(" && ")).toContain("pnpm check:interfaces");
		expect(scripts["check:interfaces"]).toContain(
			"tests/contracts/action-interfaces.spec.ts",
		);
		expect(scripts["check:interfaces"]).toContain(
			"scripts/action-interface-usage.test.ts",
		);
	});

	it("requires every published input without a default", async () => {
		// Arrange
		const paths = (
			await readdir(join(root, "actions"), { recursive: true })
		).filter((path) => path.endsWith("/action.yml"));

		// Act
		const manifests = await Promise.all(
			paths.map(async (path) => ({
				path,
				manifest: await readYaml<ActionManifest>(`actions/${path}`),
			})),
		);

		// Assert
		expect(manifests.length).toBeGreaterThan(0);
		for (const { path, manifest } of manifests) {
			for (const [name, input] of Object.entries(manifest.inputs ?? {})) {
				expect(input.required, `${path}: ${name}`).toBe(true);
				expect(input, `${path}: ${name}`).not.toHaveProperty("default");
			}
		}
	});

	it("requires every reusable and manual workflow input without a default", async () => {
		// Arrange
		const paths = (await readdir(join(root, ".github/workflows"))).filter(
			(path) => path.endsWith(".yml"),
		);
		// Act
		const workflows = await Promise.all(
			paths.map((path) => readYaml<Workflow>(`.github/workflows/${path}`)),
		);
		// Assert
		for (const workflow of workflows)
			for (const trigger of ["workflow_call", "workflow_dispatch"] as const)
				for (const [name, input] of Object.entries(
					workflow.on?.[trigger]?.inputs ?? {},
				)) {
					expect(input.required, `${workflow.name}: ${name}`).toBe(true);
					expect(input, `${workflow.name}: ${name}`).not.toHaveProperty(
						"default",
					);
				}
	});

	it("requires operational consumers for reusable workflow outputs", async () => {
		// Arrange
		const paths = (await readdir(join(root, ".github/workflows"))).filter(
			(path) => path.endsWith(".yml"),
		);
		const workflows = await Promise.all(
			paths.map(async (path) => ({
				path,
				workflow: await readYaml<Workflow>(`.github/workflows/${path}`),
			})),
		);
		const violations: string[] = [];
		// Act
		for (const { path, workflow } of workflows)
			for (const output of Object.keys(
				workflow.on?.workflow_call?.outputs ?? {},
			)) {
				const consumed = workflows.some(
					(caller) =>
						!caller.path.startsWith("__") &&
						Object.entries(caller.workflow.jobs ?? {}).some(
							([id, job]) =>
								job.uses === `./.github/workflows/${path}` &&
								Object.entries(caller.workflow.jobs ?? {}).some(
									([otherId, other]) =>
										otherId !== id &&
										ActionInterfaceUsage.operationalValues(other).some(
											(value) =>
												value.includes(`needs.${id}.outputs.${output}`),
										),
								),
						),
				);
				if (!consumed)
					violations.push(`${path}: unused workflow output ${output}`);
			}
		// Assert
		expect(violations).toEqual([]);
	});

	it("wires every caller explicitly and retains only operationally consumed outputs", async () => {
		// Arrange
		const paths = (
			await readdir(join(root, "actions"), { recursive: true })
		).filter((path) => path.endsWith("/action.yml"));
		const manifests = new Map(
			await Promise.all(
				paths.map(
					async (path) =>
						[
							path.replace(/\/action.yml$/, ""),
							await readYaml<ActionManifest>(`actions/${path}`),
						] as const,
				),
			),
		);
		const workflowPaths = (
			await readdir(join(root, ".github/workflows"))
		).filter((path) => path.endsWith(".yml"));
		const consumed = new Map(
			[...manifests.keys()].map((name) => [name, new Set<string>()]),
		);
		const inputValues = new Map(
			[...manifests].map(([name, manifest]) => [
				name,
				new Map(
					Object.keys(manifest.inputs ?? {}).map((input) => [
						input,
						[] as unknown[],
					]),
				),
			]),
		);
		const runtime = join(root, "packages/runtime/github-actions/src");
		const sources = await Promise.all(
			(await readdir(runtime, { recursive: true }))
				.filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
				.map((path) => readFile(join(runtime, path), "utf8")),
		);
		const flags = new Set(
			sources.flatMap((source) =>
				[
					...source.matchAll(
						/(?:RuntimeInput\.(?:booleanInput|enumInput)|core\.getBooleanInput)\(\s*"([^"]+)"/g,
					),
				].map((match) => match[1]),
			),
		);
		const violations: string[] = [];
		const references = (text: string) =>
			[
				...text.matchAll(
					/\bsteps(?:\.([\w-]+)|\[['"]([^'"]+)['"]\])\.outputs(?:\.([\w-]+)|\[['"]([^'"]+)['"]\])/g,
				),
			].map((match) => ({
				step: match[1] ?? match[2],
				output: match[3] ?? match[4],
			}));

		// Act
		for (const path of workflowPaths) {
			const workflow = await readYaml<Workflow>(`.github/workflows/${path}`);
			for (const [jobId, job] of Object.entries(workflow.jobs ?? {})) {
				const steps = job.steps ?? [];
				for (const step of steps) {
					const action = step.uses?.match(
						/^\.\/(?:\.\.\/self-workflow\/)?actions\/(.+)$/,
					)?.[1];
					if (!action) continue;
					const manifest = manifests.get(action);
					if (!manifest) {
						violations.push(`${path}: unknown action ${action}`);
						continue;
					}
					for (const input of Object.keys(manifest.inputs ?? {})) {
						if (!Object.hasOwn(step.with ?? {}, input))
							violations.push(`${path}: ${action} omits ${input}`);
						else if (
							String(step.with?.[input] ?? "").trim() === "" &&
							!(path.startsWith("__") && step["continue-on-error"] === true)
						)
							violations.push(`${path}: ${action} passes an empty ${input}`);
					}
					for (const input of Object.keys(step.with ?? {}))
						if (!Object.hasOwn(manifest.inputs ?? {}, input))
							violations.push(`${path}: ${action} receives unknown ${input}`);
					for (const ref of references(
						ActionInterfaceUsage.strings(job).join("\n"),
					)) {
						if (
							ref.step === step.id &&
							!Object.hasOwn(manifest.outputs ?? {}, ref.output)
						)
							violations.push(`${path}: ${action} has no ${ref.output} output`);
					}
					if (path.startsWith("__")) continue;
					for (const [input, value] of Object.entries(step.with ?? {}))
						inputValues.get(action)?.get(input)?.push(value);
					let operational =
						ActionInterfaceUsage.operationalValues(job).join("\n");
					for (const [output, expression] of Object.entries(
						job.outputs ?? {},
					)) {
						const downstream = Object.entries(workflow.jobs ?? {})
							.filter(([id]) => id !== jobId)
							.flatMap(([, other]) =>
								ActionInterfaceUsage.operationalValues(other),
							)
							.join("\n");
						if (downstream.includes(`needs.${jobId}.outputs.${output}`))
							operational +=
								ActionInterfaceUsage.strings(expression).join("\n");
					}
					for (const ref of references(operational))
						if (ref.step === step.id) consumed.get(action)?.add(ref.output);
				}
			}
		}
		for (const [action, manifest] of manifests)
			for (const output of Object.keys(manifest.outputs ?? {}))
				if (!consumed.get(action)?.has(output))
					violations.push(`${action}: unused output ${output}`);

		for (const [action, inputs] of inputValues)
			for (const [input, values] of inputs) {
				const problem = ActionInterfaceUsage.inputProblem(
					values,
					flags.has(input),
				);
				if (problem) violations.push(`${action}: ${input} ${problem}`);
			}

		// Assert
		expect(violations).toEqual([]);
	});

	it("requires runtime input reads and forbids omission fallbacks", async () => {
		// Arrange
		const directory = join(root, "packages/runtime/github-actions/src");
		const paths = (await readdir(directory, { recursive: true })).filter(
			(path) => path.endsWith(".ts") && !path.endsWith(".test.ts"),
		);
		const violations: string[] = [];
		let reads = 0;

		// Act
		for (const path of paths) {
			const ast = parse(await readFile(join(directory, path), "utf8"), {
				sourceType: "module",
				plugins: ["typescript"],
			});
			const visit = (node: unknown, parent?: Record<string, unknown>): void => {
				if (!node || typeof node !== "object") return;
				const value = node as Record<string, unknown>;
				if (value.type === "CallExpression") {
					const call = node as Extract<
						Extract<
							ReturnType<typeof parse>["program"]["body"][number],
							{ type: "ExpressionStatement" }
						>["expression"],
						{ type: "CallExpression" }
					>;
					if (
						call.callee.type === "MemberExpression" &&
						call.callee.object.type === "Identifier" &&
						call.callee.object.name === "core" &&
						call.callee.property.type === "Identifier" &&
						["getInput", "getBooleanInput"].includes(call.callee.property.name)
					) {
						reads++;
						const options = call.arguments[1];
						const required =
							options?.type === "ObjectExpression" &&
							options.properties.some(
								(property) =>
									property.type === "ObjectProperty" &&
									property.key.type === "Identifier" &&
									property.key.name === "required" &&
									property.value.type === "BooleanLiteral" &&
									property.value.value,
							);
						if (!required || parent?.type === "LogicalExpression")
							violations.push(`${path}:${call.loc?.start.line}`);
					}
				}
				for (const child of Object.values(value))
					if (Array.isArray(child))
						for (const entry of child) visit(entry, value);
					else if (child && typeof child === "object") visit(child, value);
			};
			visit(ast);
		}

		// Assert
		expect(reads).toBeGreaterThan(0);
		expect(violations).toEqual([]);
	});
});
