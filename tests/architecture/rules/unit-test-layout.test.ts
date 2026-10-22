import { describe, expect, it } from "vitest";
import { UnitTestLayout } from "./unit-test-layout.js";

describe("UnitTestLayout", () => {
	it.each([
		[
			"packages/domain/example/src/policy.ts",
			"packages/domain/example/src/policy.test.ts",
		],
		[
			"packages/adapter/example-scope/example/src/client.ts",
			"packages/adapter/example-scope/example/src/client.test.ts",
		],
		[
			"tests/architecture/rules/check.ts",
			"tests/architecture/rules/check.test.ts",
		],
		["tests/contracts/interface.ts", "tests/contracts/interface.test.ts"],
		[
			"tests/integration/github-actions/wait.mjs",
			"tests/integration/github-actions/wait.test.ts",
		],
		[
			"packages/runtime/github-actions/packaging/build.mjs",
			"packages/runtime/github-actions/packaging/build.test.ts",
		],
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
		["tests/architecture/rules/other.test.ts", "unit-test-subject"],
		["tests/contracts/other.test.ts", "unit-test-subject"],
		["tests/integration/github-actions/other.test.ts", "unit-test-subject"],
		[
			"packages/runtime/github-actions/packaging/other.test.ts",
			"unit-test-subject",
		],
		["tests/policy.test.ts", "unit-test-location"],
		["tests/misc/policy.test.ts", "unit-test-location"],
		["tests/contracts/interface.test.js", "unit-test-location"],
	])("rejects a misplaced or mismatched unit test: %s", (file, rule) => {
		// Arrange
		const layout = new UnitTestLayout([
			"packages/domain/example/src/policy.ts",
			"tests/architecture/rules/check.ts",
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
			"tests/architecture/boundaries.spec.ts",
			"tests/journey-integration.spec.ts",
			"tests/contracts/actions.spec.ts",
			"packages/domain/example/testing/policy.fixtures.ts",
		]);

		// Act
		const violations = layout.inspect();

		// Assert
		expect(violations).toEqual([]);
	});
});
