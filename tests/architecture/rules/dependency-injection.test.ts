import { describe, expect, it } from "vitest";
import { CodeStructure } from "./code-structure.js";

const sourcePath = "packages/domain/example/src/policy.ts";

describe("constructor injection", () => {
	it.each([
		"class Service { constructor(private makeDate = () => new Date()) {} }",
		"class Service { constructor(dependencies: Dependencies, private policy = dependencies.createPolicy()) {} }",
		"class Service { render(messages = this.dependencies.createMessages()) {} }",
		"class Service { constructor(private client = buildClient()) {} }",
		"class Service { constructor(private client = supplied ?? buildClient()) {} }",
		"class Service { constructor(private dependencies = { clock: () => new Date() }) {} }",
	])("rejects behavior hidden in parameter defaults: %s", (source) => {
		// Arrange
		const rule = new CodeStructure(sourcePath);

		// Act
		const result = rule.inspect(source);

		// Assert
		expect(result).toContainEqual(
			expect.objectContaining({ rule: "required-collaborator" }),
		);
	});
	it.each([
		"class Policy { static evaluate() { return true; } }",
		"class Policy { private static evaluate() { return true; } }",
		"class Policy { static get value() { return true; } }",
		"class Policy { static readonly evaluate = () => true; }",
		"class Policy { static readonly actions = { evaluate() {} }; }",
		"class Policy { static { console.log('side effect'); } }",
		"class Policy { private constructor() {} static evaluate(): boolean { return true; } }",
	])("rejects static service behavior: %s", (source) => {
		// Arrange
		const rule = new CodeStructure(sourcePath);

		// Act
		const result = rule.inspect(source);

		// Assert
		expect(result).toContainEqual(
			expect.objectContaining({ rule: "instance-behavior" }),
		);
	});
	it.each([
		"class Service { execute() { return new Policy().evaluate(); } }",
		"class Service { private policy = new Policy(); }",
		"class Service { constructor(private policy = new Policy()) {} }",
		"const policy = new Policy();",
	])("rejects hidden construction: %s", (body) => {
		// Arrange
		const source = `import { Policy } from './policy.js'; ${body}`;

		// Act
		const result = new CodeStructure(sourcePath).inspect(source);

		// Assert
		expect(result).toContainEqual(
			expect.objectContaining({ rule: "injected-collaborator" }),
		);
	});
	it.each([
		"class Service { constructor(private policy: Policy) {} execute() { return this.policy.evaluate(); } }",
		"class Service { constructor(private createSession: () => Session) {} execute() { return this.createSession().run(); } }",
		"class Policy { static readonly version = 1; evaluate() { return true; } }",
		"class Service { constructor(private count = 1, private options = {}) {} }",
		"class Value { private constructor(readonly value: string) {} static parse(value: string): Value | undefined { return value ? new Value(value) : undefined; } get text() { return this.value; } }",
	])("accepts explicit collaborators and immutable data: %s", (source) => {
		// Arrange
		const rule = new CodeStructure(sourcePath);

		// Act
		const result = rule.inspect(source);

		// Assert
		expect(result).toEqual([]);
	});
	it("allows construction at an explicit composition boundary", () => {
		// Arrange
		const filename = "packages/domain/example/src/dependency-composition.ts";
		const source =
			"import { Policy } from './policy.js'; class Composition { create() { return new Policy(); } }";

		// Act
		const result = new CodeStructure(filename).inspect(source);

		// Assert
		expect(result).toEqual([]);
	});
});
