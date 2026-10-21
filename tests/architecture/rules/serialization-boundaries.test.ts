import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";
import { SerializationBoundaries } from "./serialization-boundaries.js";

describe("SerializationBoundaries", () => {
	it.each([
		"JSON.parse(text) as StoredRecord",
		"JSON.parse(text) as any",
		"<StoredRecord>JSON.parse(text)",
		"(JSON.parse(text) as unknown) as StoredRecord",
	])("rejects unvalidated JSON assertions: %s", (source) => {
		// Arrange
		const expression = parse(source, { plugins: ["typescript"] }).program
			.body[0];
		if (expression.type !== "ExpressionStatement")
			throw new Error("Expected expression");

		// Act
		const violations = new SerializationBoundaries().inspect(
			expression.expression,
		);

		// Assert
		expect(violations).toMatchObject([{ rule: "unknown-json-input" }]);
	});

	it.each([
		"JSON.stringify(left) === JSON.stringify(right)",
		"saved !== JSON['stringify'](next)",
		"JSON.stringify(left) != serialized",
	])("rejects equality through JSON: %s", (source) => {
		// Arrange
		const expression = parse(source).program.body[0];
		if (expression.type !== "ExpressionStatement")
			throw new Error("Expected expression");

		// Act
		const violations = new SerializationBoundaries().inspect(
			expression.expression,
		);

		// Assert
		expect(violations).toMatchObject([{ rule: "semantic-equality" }]);
	});

	it.each([
		"JSON.parse(text) as unknown",
		"decode(JSON.parse(text))",
		"left.id === right.id",
		"fingerprint(JSON.stringify([operation, revision]))",
	])("allows boundary decoding and explicit serialization: %s", (source) => {
		// Arrange
		const expression = parse(source, { plugins: ["typescript"] }).program
			.body[0];
		if (expression.type !== "ExpressionStatement")
			throw new Error("Expected expression");

		// Act
		const violations = new SerializationBoundaries().inspect(
			expression.expression,
		);

		// Assert
		expect(violations).toEqual([]);
	});
});
