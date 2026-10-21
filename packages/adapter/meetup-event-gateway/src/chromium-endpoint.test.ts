import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Browser } from "playwright-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChromiumEndpoint } from "./chromium-endpoint.js";

const directories: string[] = [];

async function fixture(content: string) {
	const directory = await mkdtemp(join(tmpdir(), "chromium-endpoint-test-"));
	directories.push(directory);
	await writeFile(join(directory, "DevToolsActivePort"), content);
	const session = {
		send: vi.fn().mockResolvedValue({
			arguments: [`--user-data-dir=${directory}`],
		}),
		detach: vi.fn().mockResolvedValue(undefined),
	};
	const browser = {
		newBrowserCDPSession: vi.fn().mockResolvedValue(session),
	} as unknown as Browser;
	return { browser, session };
}

afterEach(async () => {
	await Promise.all(
		directories.splice(0).map((path) => rm(path, { recursive: true })),
	);
});

describe("Chromium endpoint discovery", () => {
	it("uses only a loopback endpoint and detaches the discovery session", async () => {
		// Arrange
		const { browser, session } = await fixture(
			"43210\n/devtools/browser/abc-123\n",
		);
		// Act
		const endpoint = await ChromiumEndpoint.read(browser);
		// Assert
		expect(endpoint).toBe("ws://127.0.0.1:43210/devtools/browser/abc-123");
		expect(session.detach).toHaveBeenCalledOnce();
	});

	it.each(["0", "65536", "host:80"])(
		"rejects an invalid port %s",
		async (port) => {
			// Arrange
			const { browser, session } = await fixture(
				`${port}\n/devtools/browser/abc-123\n`,
			);
			// Act
			const result = ChromiumEndpoint.read(browser);
			// Assert
			await expect(result).rejects.toThrow("Browser endpoint unavailable.");
			expect(session.detach).toHaveBeenCalledOnce();
		},
	);

	it("rejects a missing browser profile and still detaches", async () => {
		// Arrange
		const { browser, session } = await fixture("");
		session.send.mockResolvedValue({ arguments: [] });
		// Act
		const result = ChromiumEndpoint.read(browser);
		// Assert
		await expect(result).rejects.toThrow("Browser profile unavailable.");
		expect(session.detach).toHaveBeenCalledOnce();
	});
});
