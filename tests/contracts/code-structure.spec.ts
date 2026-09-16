import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { ProductionCodeStructure } from "../../scripts/production-code-structure.mjs";
import { UnitTestLayout } from "../../scripts/unit-test-layout.mjs";

const sourcePath = "packages/domain/example/src/example.ts";
async function biomeFixture(source: string): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "code-structure-"));
	const config = JSON.parse(await readFile("biome.json", "utf8"));
	config.vcs.enabled = false;
	await mkdir(join(directory, "packages/domain/example/src"), {
		recursive: true,
	});
	await writeFile(join(directory, "biome.json"), JSON.stringify(config));
	await writeFile(join(directory, sourcePath), source);
	return directory;
}
async function lintFixture(
	directory: string,
): Promise<{ status: number; stdout: string }> {
	const args = [
		resolve("node_modules/@biomejs/biome/bin/biome"),
		"lint",
		"--reporter=json",
		sourcePath,
	];
	try {
		const result = await promisify(execFile)(process.execPath, args, {
			cwd: directory,
			timeout: 10_000,
		});
		return { status: 0, stdout: result.stdout };
	} catch (error) {
		if (
			!(error instanceof Error) ||
			!("code" in error) ||
			!("stdout" in error) ||
			typeof error.code !== "number" ||
			typeof error.stdout !== "string"
		)
			throw error;
		return { status: error.code, stdout: error.stdout };
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}
describe("production code structure", () => {
	it.each([
		["style/noExcessiveClassesPerFile", "class First {}\nclass Second {}"],
		[
			"style/noExcessiveLinesPerFile",
			Array.from(
				{ length: 301 },
				(_, index) => `export const VALUE_${index} = ${index};`,
			).join("\n"),
		],
		[
			"complexity/noExcessiveLinesPerFunction",
			`class Policy { evaluate() {\n${"this.evaluate();\n".repeat(61)}} }`,
		],
		[
			"complexity/noExcessiveCognitiveComplexity",
			`class Policy { evaluate(value: boolean) { ${"if (value) {".repeat(6)} return 1; ${"}".repeat(6)} } }`,
		],
	])("rejects violations of the configured %s limit", async (rule, source) => {
		// Arrange
		const fixture = await biomeFixture(source);

		// Act
		const result = await lintFixture(fixture);
		const report = JSON.parse(result.stdout);

		// Assert
		expect(result.status).toBe(1);
		expect(report.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ category: `lint/${rule}` }),
			]),
		);
	});
	it("checks every production package", async () => {
		// Arrange
		const audit = new ProductionCodeStructure();

		// Act
		const result = await audit.inspect();

		// Assert
		expect(result.files).toBeGreaterThan(0);
		expect(result.violations).toEqual([]);
	});
	it("keeps all unit tests beside their matching source files", async () => {
		// Arrange
		const source = new ProductionCodeStructure();
		const paths = (
			await Promise.all([
				source.sourceFiles("packages"),
				source.sourceFiles("scripts"),
			])
		).flat();
		const layout = new UnitTestLayout(
			paths.map((path) => relative(process.cwd(), path)),
		);

		// Act
		const violations = layout.inspect();

		// Assert
		expect(violations).toEqual([]);
	});
});
