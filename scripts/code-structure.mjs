import { parse } from "@babel/parser";

const behaviors = new Set([
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression",
	"ObjectMethod",
	"TSDeclareFunction",
]);

/** Repository policy: production behavior has a class owner; entrypoints re-export. */
export class CodeStructure {
	constructor(filename) {
		this.filename = filename;
	}

	inspect(source) {
		const violations = [];
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
					line: statement.loc.start.line,
					message:
						"Package entrypoints must only import or re-export named declarations.",
				});
			}
		}
		const visit = (node, inClass = false) => {
			if (!node || typeof node !== "object") return;
			const owned = inClass || node.type === "ClassBody";
			if (!owned && behaviors.has(node.type)) {
				violations.push({
					rule: "class-owned-behavior",
					line: node.loc.start.line,
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
						visit(child, owned);
					});
				else if (value && typeof value === "object" && "type" in value)
					visit(value, owned);
			}
		};
		visit(ast.program);
		return violations;
	}
}
