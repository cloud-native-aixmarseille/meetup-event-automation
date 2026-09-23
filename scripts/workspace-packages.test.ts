import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { workspacePackageDirectories } from "./workspace-packages.mjs";

describe("workspacePackageDirectories", () => {
	let directory: string;

	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), "workspace-packages-"));
	});

	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	it("ignores dependency-only and empty directories left by removed packages", async () => {
		// Arrange
		const active = join(directory, "active");
		await mkdir(active);
		await writeFile(join(active, "package.json"), "{}");
		await mkdir(join(directory, "retired", "node_modules", "dependency"), {
			recursive: true,
		});
		await mkdir(join(directory, "empty"));
		await mkdir(join(directory, "node_modules", "dependency"), {
			recursive: true,
		});
		await writeFile(join(directory, "README.md"), "Workspace packages");

		// Act
		const packages = await workspacePackageDirectories(directory);

		// Assert
		expect(packages).toEqual([active]);
	});

	it.each(["project.json", "policy.ts"])(
		"keeps packages with %s visible even when their manifest is missing",
		async (file) => {
			// Arrange
			const incomplete = join(directory, "incomplete");
			await mkdir(incomplete);
			await writeFile(join(incomplete, file), "");

			// Act
			const packages = await workspacePackageDirectories(directory);

			// Assert
			expect(packages).toEqual([incomplete]);
		},
	);
});
