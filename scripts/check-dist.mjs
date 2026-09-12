import { readFile } from "node:fs/promises";
import { actionBundles, buildActionBundles } from "./build-actions.mjs";

async function readBundle(path) {
	try {
		return await readFile(path);
	} catch (error) {
		if (error.code === "ENOENT") return undefined;
		throw error;
	}
}

console.info("check-dist: capturing current action bundles.");
const paths = actionBundles.map(([, outfile]) => outfile);
const before = await Promise.all(paths.map(readBundle));

console.info("check-dist: rebuilding action bundles for comparison.");
await buildActionBundles();
const after = await Promise.all(paths.map(readBundle));
const stale = paths.filter((_, index) => !before[index]?.equals(after[index]));

if (stale.length > 0) {
	console.error("check-dist: generated action bundles were stale or missing:");
	for (const path of stale) console.error(`  ${path}`);
	process.exitCode = 1;
} else {
	console.info("check-dist: action bundles are up to date.");
}
