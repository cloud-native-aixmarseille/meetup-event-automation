import { describe, expect, it } from "vitest";
import { CodeStructure } from "./code-structure.mjs";

const sourcePath = "packages/domain/example/src/example.ts";

describe("CodeStructure", () => {
	it.each([
		"export function evaluate() { return true; }",
		"export async function evaluate() { return true; }",
		"export const evaluate = () => true;",
		"const evaluate = function () { return true; };",
		"const policy = { evaluate() { return true; } };",
		"const values = [1].map(value => value + 1);",
		"declare function evaluate(value: string): boolean;",
		"namespace Policy { export function evaluate() {} }",
		"export default <T>(value: T) => value;",
	])("rejects unowned behavior: %s", (source) => {
		// Arrange
		const filename = sourcePath;

		// Act
		const violations = new CodeStructure(filename).inspect(source);

		// Assert
		expect(violations).toContainEqual({
			rule: "class-owned-behavior",
			line: 1,
			message: expect.any(String),
		});
	});
	it.each([
		"export class Policy { evaluate() { return true; } }",
		"export class Policy { static evaluate() { return [1].map(value => value + 1); } }",
		"export class Policy { evaluate = () => true; }",
		"const Policy = class { evaluate() { return true; } };",
		"export class Policy { evaluate() { function local() { return true; } return local(); } }",
		"export interface Policy { evaluate(value: string): boolean; }",
		"export type Policy = (value: string) => boolean;",
		"export const VERSION = 1;",
	])("accepts class-owned behavior or declarations: %s", (source) => {
		// Arrange
		const filename = sourcePath;

		// Act
		const violations = new CodeStructure(filename).inspect(source);

		// Assert
		expect(violations).toEqual([]);
	});
	it.each([
		"export class Policy {}",
		"export const VERSION = 1;",
		"export interface Policy {}",
		"Policy.execute();",
		'import "./startup.js";',
	])("keeps implementations out of the package entrypoint: %s", (source) => {
		// Arrange
		const filename = "packages/domain/example/src/index.ts";

		// Act
		const violations = new CodeStructure(filename).inspect(source);

		// Assert
		expect(violations).toContainEqual({
			rule: "entrypoint-exports",
			line: 1,
			message: expect.any(String),
		});
	});
	it("accepts an entrypoint that exposes existing declarations", () => {
		// Arrange
		const source =
			'export { Policy } from "./policy.js"; export type { Input } from "./contracts.js";';
		const filename = "packages/domain/example/src/index.ts";

		// Act
		const violations = new CodeStructure(filename).inspect(source);

		// Assert
		expect(violations).toEqual([]);
	});
});
