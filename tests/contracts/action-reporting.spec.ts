import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";
import { LocalizationComposition } from "../../packages/presentation/localization/src/index.js";
import { ActionMessages } from "../../packages/runtime/github-actions/src/i18n/action-messages.js";
import type { MessageId } from "../../packages/runtime/github-actions/src/i18n/catalog.js";
import { type ActionManifest, readYaml, root } from "./support.js";

describe("public action reporting contract", () => {
	it("routes every published action through the awaited shared runner using its localized public title", async () => {
		// Arrange
		const manifests = (
			await readdir(join(root, "actions"), { recursive: true })
		).filter((path) => path.endsWith("/action.yml"));
		const buildSource = await readFile(
			join(root, "scripts/build-actions.mjs"),
			"utf8",
		);

		// Act
		const actions = await Promise.all(
			manifests.map(async (path) => {
				const directory = path.replace(/\/action\.yml$/, "");
				const entrypoint =
					"packages/runtime/github-actions/src/entrypoints/" +
					directory.replaceAll("/", "-") +
					".ts";
				const manifest = await readYaml<ActionManifest>(join("actions", path));
				const source = await readFile(join(root, entrypoint), "utf8");
				const ast = parse(source, {
					sourceType: "module",
					plugins: ["typescript"],
				});
				return {
					directory,
					entrypoint,
					manifest,
					statements: ast.program.body,
					title: new ActionMessages({
						localeResolver: new LocalizationComposition().localeResolver(),
					}).t(
						`action.${directory.replaceAll("/", ".")}` as Extract<
							MessageId,
							`action.${string}`
						>,
					),
				};
			}),
		);

		// Assert
		expect(actions.length).toBeGreaterThan(0);
		for (const {
			directory,
			entrypoint,
			manifest,
			statements,
			title,
		} of actions) {
			expect(title).toBe(manifest.name);
			expect(buildSource, directory).toContain(entrypoint);
			expect(buildSource, directory).toContain(
				`actions/${directory}/dist/index.js`,
			);
			const declarations = statements.filter(
				(statement) => statement.type === "VariableDeclaration",
			);
			expect(
				declarations.map((statement) => statement.declarations[0]),
			).toMatchObject([
				{
					id: { name: "runner" },
					init: {
						type: "CallExpression",
						callee: {
							property: { name: "actionRunner" },
							object: {
								type: "NewExpression",
								callee: { name: "GithubActionsComposition" },
							},
						},
					},
				},
				{
					id: { name: "action" },
					init: {
						type: "CallExpression",
						callee: {
							object: {
								type: "NewExpression",
								callee: { name: expect.stringMatching(/ActionComposition$/) },
							},
						},
					},
				},
			]);
			expect(
				statements.filter(
					(statement) => statement.type === "ExpressionStatement",
				),
				directory,
			).toMatchObject([
				{
					expression: {
						type: "AwaitExpression",
						argument: {
							type: "CallExpression",
							callee: { object: { name: "runner" }, property: { name: "run" } },
							arguments: [
								{
									type: "StringLiteral",
									value: `action.${directory.replaceAll("/", ".")}`,
								},
								{
									type: "CallExpression",
									callee: {
										property: { name: "bind" },
										object: { object: { name: "action" } },
									},
									arguments: [{ name: "action" }],
								},
								{
									type: "BooleanLiteral",
									value: Boolean(manifest.outputs?.diagnostics),
								},
							],
						},
					},
				},
			]);
		}
	});

	it("keeps diagnostic rendering and failure signaling in the shared reporting boundary", async () => {
		// Arrange
		const runtime = join(root, "packages/runtime/github-actions/src");
		const files = (await readdir(runtime, { recursive: true })).filter(
			(path) => path.endsWith(".ts") && !path.endsWith(".test.ts"),
		);

		// Act
		const violations: string[] = [];
		for (const file of files) {
			const source = await readFile(join(runtime, file), "utf8");
			if (
				!["action-report.ts", "action-runner.ts"].includes(basename(file)) &&
				/core\.(?:summary|info|error|warning|notice|setFailed)\b|ActionOutput\.setDiagnosticsOutput\(/.test(
					source,
				)
			) {
				violations.push(file);
			}
		}

		// Assert
		expect(violations).toEqual([]);
	});
});
