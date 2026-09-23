import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";
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
				};
			}),
		);

		// Assert
		expect(actions.length).toBeGreaterThan(0);
		for (const { directory, entrypoint, manifest, statements } of actions) {
			expect(
				new ActionMessages().t(
					`action.${directory.replaceAll("/", ".")}` as Extract<
						MessageId,
						`action.${string}`
					>,
				),
			).toBe(manifest.name);
			expect(buildSource, directory).toContain(entrypoint);
			expect(buildSource, directory).toContain(
				`actions/${directory}/dist/index.js`,
			);
			expect(statements, directory).toContainEqual(
				expect.objectContaining({
					type: "ImportDeclaration",
					source: expect.objectContaining({ value: "../action-runner.js" }),
					specifiers: [
						expect.objectContaining({
							type: "ImportSpecifier",
							imported: expect.objectContaining({ name: "ActionRunner" }),
							local: expect.objectContaining({ name: "ActionRunner" }),
						}),
					],
				}),
			);
			expect(
				statements.filter(
					(statement) => statement.type !== "ImportDeclaration",
				),
				directory,
			).toEqual([
				expect.objectContaining({
					type: "ExpressionStatement",
					expression: expect.objectContaining({
						type: "AwaitExpression",
						argument: expect.objectContaining({
							type: "CallExpression",
							callee: expect.objectContaining({
								type: "MemberExpression",
								object: expect.objectContaining({ name: "ActionRunner" }),
								property: expect.objectContaining({ name: "run" }),
							}),
							arguments: [
								expect.objectContaining({
									type: "StringLiteral",
									value: `action.${directory.replaceAll("/", ".")}`,
								}),
								expect.objectContaining({ type: "MemberExpression" }),
							],
						}),
					}),
				}),
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
