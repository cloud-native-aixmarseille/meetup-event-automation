import type {
	ClassDeclaration,
	ClassExpression,
	Node,
	Program,
} from "@babel/types";
import type { StructureViolation } from "./structure-violation.js";

/** Constructor injection applies to stateless policies as well as I/O services. */
export class DependencyInjection {
	private readonly composition: boolean;
	private readonly entrypoint: boolean;
	private readonly imports = new Set<string>();

	constructor(filename: string, program: Program) {
		this.composition = /(?:^|\/)src\/(?:[\w-]+-)?composition\.ts$/.test(
			filename,
		);
		this.entrypoint =
			filename.includes("/runtime/") && filename.includes("/src/entrypoints/");
		for (const node of program.body) {
			if (
				node.type !== "ImportDeclaration" ||
				!/^(?:\.|@meetup-automation\/)/.test(node.source.value)
			)
				continue;
			for (const specifier of node.specifiers)
				this.imports.add(specifier.local.name);
		}
	}

	inspect(
		node: Node,
		owner?: ClassDeclaration | ClassExpression,
	): StructureViolation[] {
		if (this.composition) return [];
		if (node.type === "AssignmentPattern" && this.defaultBehavior(node.right))
			return this.violation(
				node,
				"required-collaborator",
				"Supply collaborators explicitly; bind factories, provider functions, and constructed defaults in composition.",
			);
		if (this.staticBehavior(node) && !this.valueFactory(owner, node))
			return this.violation(
				node,
				"instance-behavior",
				"Use an instance method and inject the collaborator through the constructor.",
			);
		if (
			node.type === "NewExpression" &&
			node.callee.type === "Identifier" &&
			this.imports.has(node.callee.name) &&
			!node.callee.name.endsWith("Error") &&
			!(this.entrypoint && node.callee.name.endsWith("Composition"))
		)
			return this.violation(
				node,
				"injected-collaborator",
				"Construct workspace collaborators in composition; inject an instance or a typed factory for operation-scoped objects.",
			);
		return [];
	}

	private defaultBehavior(value: unknown): boolean {
		if (!value || typeof value !== "object") return false;
		if (
			"type" in value &&
			[
				"ArrowFunctionExpression",
				"FunctionExpression",
				"CallExpression",
				"NewExpression",
			].includes(String(value.type))
		)
			return true;
		return Object.values(value).some((child) =>
			Array.isArray(child)
				? child.some((item) => this.defaultBehavior(item))
				: this.defaultBehavior(child),
		);
	}

	private staticBehavior(node: Node): boolean {
		if (node.type === "StaticBlock") return true;
		if (!("static" in node) || !node.static) return false;
		return (
			node.type === "ClassMethod" ||
			node.type === "ClassPrivateMethod" ||
			!("readonly" in node && node.readonly) ||
			("value" in node && this.containsBehavior(node.value))
		);
	}

	private containsBehavior(value: unknown): boolean {
		if (!value || typeof value !== "object") return false;
		if (
			"type" in value &&
			[
				"ArrowFunctionExpression",
				"FunctionExpression",
				"ObjectMethod",
			].includes(String(value.type))
		)
			return true;
		return Object.values(value).some((child) =>
			Array.isArray(child)
				? child.some((item) => this.containsBehavior(item))
				: this.containsBehavior(child),
		);
	}

	private valueFactory(
		owner: ClassDeclaration | ClassExpression | undefined,
		method: Node,
	): boolean {
		if (!owner?.id || method.type !== "ClassMethod") return false;
		const name = owner.id.name;
		const initializer = owner.body.body.find(
			(member) =>
				member.type === "ClassMethod" && member.kind === "constructor",
		);
		if (
			initializer?.type !== "ClassMethod" ||
			initializer.accessibility !== "private" ||
			!initializer.params.every(
				(parameter) =>
					parameter.type === "TSParameterProperty" && parameter.readonly,
			)
		)
			return false;
		if (
			owner.body.body.some(
				(member) =>
					!("static" in member && member.static) &&
					!(
						"kind" in member &&
						(member.kind === "constructor" || member.kind === "get")
					),
			)
		)
			return false;
		const result = method.returnType?.typeAnnotation;
		const alternatives =
			result?.type === "TSUnionType" ? result.types : [result];
		return (
			alternatives.some(
				(type) =>
					type?.type === "TSTypeReference" &&
					type.typeName.type === "Identifier" &&
					type.typeName.name === name,
			) &&
			alternatives.every(
				(type) =>
					type?.type === "TSUndefinedKeyword" ||
					(type?.type === "TSTypeReference" &&
						type.typeName.type === "Identifier" &&
						type.typeName.name === name),
			)
		);
	}

	private violation(
		node: Node,
		rule: string,
		message: string,
	): StructureViolation[] {
		return [{ rule, line: node.loc?.start.line ?? 1, message }];
	}
}
