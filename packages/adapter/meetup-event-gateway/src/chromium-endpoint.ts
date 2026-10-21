import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Browser } from "playwright-core";

/** Discover Chromium's ephemeral, loopback-only debugging endpoint. */
export class ChromiumEndpoint {
	static async read(browser: Browser): Promise<string> {
		const session = await browser.newBrowserCDPSession();
		try {
			const command = await session.send("Browser.getBrowserCommandLine");
			const profile = command.arguments
				.find((argument) => argument.startsWith("--user-data-dir="))
				?.slice("--user-data-dir=".length);
			if (!profile) throw new Error("Browser profile unavailable.");
			const [port, path] = (
				await readFile(join(profile, "DevToolsActivePort"), "utf8")
			)
				.trim()
				.split("\n");
			if (
				!/^\d+$/.test(port) ||
				Number(port) < 1 ||
				Number(port) > 65535 ||
				!/^\/devtools\/browser\/[a-f0-9-]+$/.test(path)
			)
				throw new Error("Browser endpoint unavailable.");
			return `ws://127.0.0.1:${port}${path}`;
		} finally {
			await session.detach();
		}
	}
}
