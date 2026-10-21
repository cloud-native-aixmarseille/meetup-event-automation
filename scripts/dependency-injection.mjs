/** Constructor injection applies to stateless policies as well as I/O services. */
export class DependencyInjection {
	constructor(filename, program) {
		this.composition = /(?:^|\/)src\/(?:[\w-]+-)?composition\.ts$/.test(
			filename,
		);
		this.entrypoint =
			filename.includes("/runtime/") && filename.includes("/src/entrypoints/");
		this.imports = new Set(
			program.body
				.filter(
					(node) =>
						node.type === "ImportDeclaration" &&
						/^(?:\.|@meetup-automation\/)/.test(node.source.value),
				)
				.flatMap((node) =>
					node.specifiers.map((specifier) => specifier.local.name),
				),
		);
	}

	inspect(node, owner) {
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

	defaultBehavior(value) {
		if (!value || typeof value !== "object") return false;
		if (
			[
				"ArrowFunctionExpression",
				"FunctionExpression",
				"CallExpression",
				"NewExpression",
			].includes(value.type)
		)
			return true;
		return Object.values(value).some((child) =>
			Array.isArray(child)
				? child.some((item) => this.defaultBehavior(item))
				: this.defaultBehavior(child),
		);
	}

	staticBehavior(node) {
		if (node.type === "StaticBlock") return true;
		if (!node.static) return false;
		return (
			node.type === "ClassMethod" ||
			node.type === "ClassPrivateMethod" ||
			!node.readonly ||
			this.containsBehavior(node.value)
		);
	}

	containsBehavior(value) {
		if (!value || typeof value !== "object") return false;
		if (
			[
				"ArrowFunctionExpression",
				"FunctionExpression",
				"ObjectMethod",
			].includes(value.type)
		)
			return true;
		return Object.values(value).some((child) =>
			Array.isArray(child)
				? child.some((item) => this.containsBehavior(item))
				: this.containsBehavior(child),
		);
	}

	valueFactory(owner, method) {
		if (!owner || method.type !== "ClassMethod") return false;
		const initializer = owner.body.body.find(
			(member) => member.kind === "constructor",
		);
		if (
			initializer?.accessibility !== "private" ||
			!initializer.params.every(
				(parameter) =>
					parameter.type === "TSParameterProperty" && parameter.readonly,
			)
		)
			return false;
		if (
			owner.body.body.some(
				(member) =>
					!member.static &&
					member.kind !== "constructor" &&
					member.kind !== "get",
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
					type.typeName.name === owner.id.name,
			) &&
			alternatives.every(
				(type) =>
					type?.type === "TSUndefinedKeyword" ||
					(type?.type === "TSTypeReference" &&
						type.typeName.name === owner.id.name),
			)
		);
	}

	violation(node, rule, message) {
		return [{ rule, line: node.loc.start.line, message }];
	}
}
