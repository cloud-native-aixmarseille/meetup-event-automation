import type { StructureViolation } from "./structure-violation.js";

/** Unit tests live beside their subject and share its basename. */
export class UnitTestLayout {
	private readonly files: Set<string>;

	constructor(files: readonly string[]) {
		this.files = new Set(files.map((file) => file.replaceAll("\\", "/")));
	}

	inspect(): (StructureViolation & { file: string })[] {
		const violations: (StructureViolation & { file: string })[] = [];
		for (const file of this.files) {
			if (!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)) continue;
			if (file.startsWith("tests/") && file.endsWith(".spec.ts")) continue;
			const packageSource = /^packages\/[^/]+\/[^/]+\/src\//.test(file);
			const toolingOwner =
				file.startsWith("packages/runtime/github-actions/packaging/") ||
				/^tests\/(architecture|contracts|integration)\//.test(file);
			if (!file.endsWith(".test.ts") || (!packageSource && !toolingOwner)) {
				violations.push({
					file,
					rule: "unit-test-location",
					line: 1,
					message:
						"Place unit tests beside their source as <component>.test.ts.",
				});
				continue;
			}
			const stem = file.slice(0, -".test.ts".length);
			const extensions = toolingOwner ? [".mjs", ".ts"] : [".ts"];
			if (!extensions.some((extension) => this.files.has(stem + extension))) {
				violations.push({
					file,
					rule: "unit-test-subject",
					line: 1,
					message:
						"A unit test must have a sibling source file with the same basename.",
				});
			}
		}
		return violations;
	}
}
