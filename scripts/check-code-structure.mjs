import { relative } from "node:path";
import { ProductionCodeStructure } from "./production-code-structure.mjs";
import { UnitTestLayout } from "./unit-test-layout.mjs";

const structure = new ProductionCodeStructure();
const result = await structure.inspect();
const paths = (
	await Promise.all([
		structure.sourceFiles("packages"),
		structure.sourceFiles("scripts"),
	])
).flat();
result.violations.push(
	...new UnitTestLayout(
		paths.map((path) => relative(process.cwd(), path)),
	).inspect(),
);
for (const violation of result.violations) {
	console.error(
		`${violation.file}:${violation.line} ${violation.rule}: ${violation.message}`,
	);
}
if (result.violations.length) process.exitCode = 1;
else
	console.info(`Code structure passed for ${result.files} production files.`);
