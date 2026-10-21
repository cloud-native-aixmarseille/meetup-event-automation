import { parse } from "@babel/parser";
import {
	type ClassDeclaration,
	type ClassExpression,
	isNode,
} from "@babel/types";
import { DependencyInjection } from "./dependency-injection.js";
import { SerializationBoundaries } from "./serialization-boundaries.js";
import type { StructureViolation } from "./structure-violation.js";

const behaviors = new Set([
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression",
	"ObjectMethod",
	"TSDeclareFunction",
]);

/** Repository policy: production behavior has a class owner; entrypoints re-export. */
export class CodeStructure {
	constructor(private readonly filename: string) {}

	inspect(source: string): StructureViolation[] {
		const violations: StructureViolation[] = [];
		const ast = parse(source, {
			sourceType: "module",
			plugins: ["typescript"],
		});
		if (this.filename.replaceAll("\\", "/").endsWith("/src/index.ts")) {
			for (const statement of ast.program.body) {
				if (
					(statement.type === "ImportDeclaration" &&
						statement.specifiers.length > 0) ||
					statement.type === "ExportAllDeclaration" ||
					(statement.type === "ExportNamedDeclaration" &&
						!statement.declaration)
				)
					continue;
				violations.push({
					rule: "entrypoint-exports",
					line: statement.loc?.start.line ?? 1,
					message:
						"Package entrypoints must only import or re-export named declarations.",
				});
			}
		}
		const serialization = new SerializationBoundaries();
		const injection = new DependencyInjection(this.filename, ast.program);
		const visit = (
			node: unknown,
			inClass = false,
			owner?: ClassDeclaration | ClassExpression,
		): void => {
			if (!isNode(node)) return;
			if (node.type === "ClassDeclaration" || node.type === "ClassExpression")
				owner = node;
			violations.push(
				...serialization.inspect(node),
				...injection.inspect(node, owner),
			);
			const owned = inClass || node.type === "ClassBody";
			if (!owned && behaviors.has(node.type)) {
				violations.push({
					rule: "class-owned-behavior",
					line: node.loc?.start.line ?? 1,
					message:
						"Move production behavior into a focused class; callbacks belong inside class methods.",
				});
				return;
			}
			for (const [key, value] of Object.entries(node)) {
				if (["loc", "start", "end", "comments", "tokens"].includes(key))
					continue;
				if (Array.isArray(value))
					value.forEach((child) => {
						visit(child, owned, owner);
					});
				else if (value && typeof value === "object" && "type" in value)
					visit(value, owned, owner);
			}
		};
		visit(ast.program);
		return violations;
	}
}
