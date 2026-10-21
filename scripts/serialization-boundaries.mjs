/** Syntax checks supplement the responsibility and semantic review. */
export class SerializationBoundaries {
	inspect(node) {
		if (
			["TSAsExpression", "TSTypeAssertion"].includes(node.type) &&
			node.typeAnnotation.type !== "TSUnknownKeyword" &&
			this.jsonCall(node.expression, "parse")
		) {
			return [
				{
					rule: "unknown-json-input",
					line: node.loc.start.line,
					message:
						"Decode JSON as unknown and validate its shape before assigning a model type.",
				},
			];
		}
		if (
			node.type === "BinaryExpression" &&
			["==", "===", "!=", "!=="].includes(node.operator) &&
			(this.jsonCall(node.left, "stringify") ||
				this.jsonCall(node.right, "stringify"))
		) {
			return [
				{
					rule: "semantic-equality",
					line: node.loc.start.line,
					message:
						"Compare meaningful fields; JSON serialization is not semantic equality.",
				},
			];
		}
		return [];
	}

	jsonCall(node, method) {
		if (
			["TSAsExpression", "TSTypeAssertion", "TSNonNullExpression"].includes(
				node.type,
			)
		)
			return this.jsonCall(node.expression, method);
		return (
			node.type === "CallExpression" &&
			node.callee.type === "MemberExpression" &&
			node.callee.object.type === "Identifier" &&
			node.callee.object.name === "JSON" &&
			(node.callee.computed
				? node.callee.property.value === method
				: node.callee.property.name === method)
		);
	}
}
