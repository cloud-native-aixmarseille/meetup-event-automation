import type { Node } from "@babel/types";
import type { StructureViolation } from "./structure-violation.js";

/** Syntax checks supplement the responsibility and semantic review. */
export class SerializationBoundaries {
	inspect(node: Node): StructureViolation[] {
		if (
			(node.type === "TSAsExpression" || node.type === "TSTypeAssertion") &&
			node.typeAnnotation.type !== "TSUnknownKeyword" &&
			this.jsonCall(node.expression, "parse")
		) {
			return [
				{
					rule: "unknown-json-input",
					line: node.loc?.start.line ?? 1,
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
					line: node.loc?.start.line ?? 1,
					message:
						"Compare meaningful fields; JSON serialization is not semantic equality.",
				},
			];
		}
		return [];
	}

	private jsonCall(node: Node, method: "parse" | "stringify"): boolean {
		if (
			node.type === "TSAsExpression" ||
			node.type === "TSTypeAssertion" ||
			node.type === "TSNonNullExpression"
		)
			return this.jsonCall(node.expression, method);
		return (
			node.type === "CallExpression" &&
			node.callee.type === "MemberExpression" &&
			node.callee.object.type === "Identifier" &&
			node.callee.object.name === "JSON" &&
			(node.callee.computed
				? node.callee.property.type === "StringLiteral" &&
					node.callee.property.value === method
				: node.callee.property.type === "Identifier" &&
					node.callee.property.name === method)
		);
	}
}
