import { readdir } from "node:fs/promises";
import { join } from "node:path";

export async function workspacePackageDirectories(
	layerRoot: string,
	packageDepth: 1 | 2 = 1,
): Promise<string[]> {
	const entries = await readdir(layerRoot, { withFileTypes: true });
	const directories: string[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name === "node_modules") continue;
		const directory = join(layerRoot, entry.name);
		if (packageDepth === 2) {
			directories.push(...(await workspacePackageDirectories(directory)));
			continue;
		}
		const contents = await readdir(directory);
		// Keep incomplete packages visible so missing manifests still fail checks.
		if (contents.some((name) => name !== "node_modules")) {
			directories.push(directory);
		}
	}
	return directories;
}
