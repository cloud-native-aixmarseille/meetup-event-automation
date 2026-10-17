import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";
import {
	type ActionManifest,
	type Workflow,
	readYaml,
	root,
} from "./support.js";

describe("minimal explicit action interfaces", () => {
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
					for (const ref of references(JSON.stringify(job))) {
						if (
							ref.step === step.id &&
							!Object.hasOwn(manifest.outputs ?? {}, ref.output)
						)
							violations.push(`${path}: ${action} has no ${ref.output} output`);
					}
					if (path.startsWith("__")) continue;
					let operational = JSON.stringify(steps);
					for (const [output, expression] of Object.entries(
						job.outputs ?? {},
					)) {
						const downstream = JSON.stringify(
							Object.entries(workflow.jobs ?? {}).filter(
								([id]) => id !== jobId,
							),
						);
						if (downstream.includes(`needs.${jobId}.outputs.${output}`))
							operational += JSON.stringify(expression);
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
						call.callee.property.name === "getInput"
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
