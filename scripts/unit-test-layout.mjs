/** Unit tests live beside their subject and share its basename. */
export class UnitTestLayout {
	constructor(files) {
		this.files = new Set(files.map((file) => file.replaceAll("\\", "/")));
	}

	inspect() {
		const violations = [];
		for (const file of this.files) {
			if (!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)) continue;
			if (!file.startsWith("packages/") && !file.startsWith("scripts/"))
				continue;
			if (
				!file.endsWith(".test.ts") ||
				(file.startsWith("packages/") && !file.includes("/src/"))
			) {
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
			const extensions = file.startsWith("scripts/")
				? [".mjs", ".ts"]
				: [".ts"];
			if (!extensions.some((extension) => this.files.has(stem + extension))) {
				violations.push({
					file,
					rule: "unit-test-subject",
					line: 1,
					message:
						"A unit test must have a sibling production file with the same basename.",
				});
			}
		}
		return violations;
	}
}
