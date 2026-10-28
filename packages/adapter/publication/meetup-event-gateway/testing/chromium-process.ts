import { type SpawnOptions, spawn } from "node:child_process";

/** Synthetic pages use Playwright's usual unsandboxed Chromium test runtime. */
export function spawnTestChromium(
	command: string,
	args: string[],
	options: SpawnOptions,
) {
	return spawn(command, [...args, "--no-sandbox"], options);
}
