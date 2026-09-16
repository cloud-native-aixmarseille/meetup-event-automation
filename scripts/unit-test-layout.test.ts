import { describe, expect, it } from "vitest";
import { UnitTestLayout } from "./unit-test-layout.mjs";

describe("UnitTestLayout", () => {
	it.each([
		[
			"packages/domain/example/src/policy.ts",
			"packages/domain/example/src/policy.test.ts",
		],
		[
			"packages/adapter/example/src/client.ts",
			"packages/adapter/example/src/client.test.ts",
		],
		["scripts/check.mjs", "scripts/check.test.ts"],
		[
			"packages\\domain\\example\\src\\policy.ts",
			"packages\\domain\\example\\src\\policy.test.ts",
		],
	])("accepts a unit test beside %s", (...files) => {
		// Arrange
		const layout = new UnitTestLayout(files);

		// Act
		const violations = layout.inspect();

		// Assert
		expect(violations).toEqual([]);
	});

	it.each([
		["packages/domain/example/__tests__/policy.test.ts", "unit-test-location"],
		["packages/domain/example/src/policy.spec.ts", "unit-test-location"],
		["packages/domain/example/src/policy.test.js", "unit-test-location"],
		["packages/domain/example/src/other.test.ts", "unit-test-subject"],
		["packages/domain/example/src/nested/policy.test.ts", "unit-test-subject"],
		["scripts/other.test.ts", "unit-test-subject"],
	])("rejects a misplaced or mismatched unit test: %s", (file, rule) => {
		// Arrange
		const layout = new UnitTestLayout([
			"packages/domain/example/src/policy.ts",
			"scripts/check.mjs",
			file,
		]);

		// Act
		const violations = layout.inspect();

		// Assert
		expect(violations).toEqual([
			{ file, rule, line: 1, message: expect.any(String) },
		]);
	});

	it("keeps repository contracts and test fixtures outside the unit-test naming rule", () => {
		// Arrange
		const layout = new UnitTestLayout([
			"tests/architecture.spec.ts",
			"tests/contracts/actions.spec.ts",
			"packages/domain/example/testing/policy.fixtures.ts",
		]);

		// Act
		const violations = layout.inspect();

		// Assert
		expect(violations).toEqual([]);
	});
});
