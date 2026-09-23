import { readdir } from "node:fs/promises";
import { join } from "node:path";

export async function workspacePackageDirectories(layerRoot) {
	const entries = await readdir(layerRoot, { withFileTypes: true });
	const directories = [];
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name === "node_modules") continue;
		const directory = join(layerRoot, entry.name);
		const contents = await readdir(directory);
		// Removed packages can leave an empty directory or only dependencies.
		// Keep incomplete packages visible so missing manifests still fail checks.
		if (contents.some((name) => name !== "node_modules")) {
			directories.push(directory);
		}
	}
	return directories;
}
