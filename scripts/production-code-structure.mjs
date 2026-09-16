import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { CodeStructure } from "./code-structure.mjs";

export class ProductionCodeStructure {
	constructor(directory = "packages") {
		this.directory = directory;
	}

	async inspect() {
		const files = (await this.sourceFiles(this.directory)).filter((path) => {
			const normalized = path.replaceAll("\\", "/");
			return (
				normalized.includes("/src/") &&
				normalized.endsWith(".ts") &&
				!/\.(test|spec)\.ts$/.test(normalized)
			);
		});
		const violations = [];
		for (const file of files) {
			const source = await readFile(file, "utf8");
			for (const violation of new CodeStructure(file).inspect(source)) {
				violations.push({ file, ...violation });
			}
		}
		return { files: files.length, violations };
	}

	async sourceFiles(directory) {
		const entries = await readdir(directory, { withFileTypes: true });
		const paths = await Promise.all(
			entries
				.filter((entry) => entry.name !== "node_modules")
				.map(async (entry) => {
					const path = join(directory, entry.name);
					return entry.isDirectory() ? this.sourceFiles(path) : [path];
				}),
		);
		return paths.flat();
	}
}
