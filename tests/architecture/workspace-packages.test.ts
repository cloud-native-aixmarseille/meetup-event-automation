import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { workspacePackageDirectories } from "./workspace-packages.js";

describe("workspacePackageDirectories", () => {
	let directory: string;

	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), "workspace-packages-"));
	});

	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	it.each([1, 2] as const)(
		"ignores dependency-only and empty directories at depth %i",
		async (depth) => {
			// Arrange
			const packageRoot =
				depth === 2 ? join(directory, "example-scope") : directory;
			const active = join(packageRoot, "active");
			await mkdir(active, { recursive: true });
			await writeFile(join(active, "package.json"), "{}");
			await mkdir(
				join(packageRoot, "dependencies-only", "node_modules", "dependency"),
				{
					recursive: true,
				},
			);
			await mkdir(join(packageRoot, "empty"));
			await mkdir(join(packageRoot, "node_modules", "dependency"), {
				recursive: true,
			});
			await writeFile(join(directory, "README.md"), "Workspace packages");

			// Act
			const packages = await workspacePackageDirectories(directory, depth);

			// Assert
			expect(packages).toEqual([active]);
		},
	);

	it.each([
		{ depth: 1, file: "project.json" },
		{ depth: 1, file: "src/policy.ts" },
		{ depth: 2, file: "project.json" },
		{ depth: 2, file: "src/policy.ts" },
	] as const)(
		"keeps packages with $file visible at depth $depth when their manifest is missing",
		async ({ depth, file }) => {
			// Arrange
			const packageRoot =
				depth === 2 ? join(directory, "example-scope") : directory;
			const incomplete = join(packageRoot, "incomplete");
			await mkdir(join(incomplete, "src"), { recursive: true });
			await writeFile(join(incomplete, file), "");

			// Act
			const packages = await workspacePackageDirectories(directory, depth);

			// Assert
			expect(packages).toEqual([incomplete]);
		},
	);

	it("discovers packages across scopes without descending into package contents", async () => {
		// Arrange
		const expected = [
			join(directory, "scope-one", "scope-one-reader"),
			join(directory, "scope-one", "scope-one-writer"),
			join(directory, "scope-two", "scope-two-reader"),
		];
		for (const packageDirectory of expected) {
			await mkdir(join(packageDirectory, "src"), { recursive: true });
			await writeFile(join(packageDirectory, "package.json"), "{}");
			await writeFile(join(packageDirectory, "src", "index.ts"), "");
		}
		await mkdir(join(directory, "empty-scope"));
		await mkdir(join(directory, "node_modules", "dependency"), {
			recursive: true,
		});

		// Act
		const packages = await workspacePackageDirectories(directory, 2);

		// Assert
		expect(packages.sort()).toEqual(expected);
	});
});
