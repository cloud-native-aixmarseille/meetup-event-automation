import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { chromium } from "playwright-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnTestChromium } from "../testing/chromium-process.js";
import { MeetupChromeProcess } from "./meetup-chrome-process.js";

afterEach(() => vi.unstubAllEnvs());

describe("Meetup Chrome process", () => {
	it("starts a private loopback browser without forwarding secrets and removes its profile", async () => {
		// Arrange
		vi.stubEnv("MEETUP_PASSWORD", "synthetic-secret");
		const launch = vi.fn(spawnTestChromium);
		const process = new MeetupChromeProcess(launch, chromium.executablePath());

		// Act
		const endpoint = await process.start("UTC");
		const args = launch.mock.calls[0][1] as string[];
		const options = launch.mock.calls[0][2];
		const directory = args
			.find((arg) => arg.startsWith("--user-data-dir="))
			?.slice("--user-data-dir=".length);
		await process.close();
		const profileExists = await access(directory ?? "").then(
			() => true,
			() => false,
		);

		// Assert
		expect(endpoint).toMatch(
			/^ws:\/\/127\.0\.0\.1:[1-9][0-9]*\/devtools\/browser\/[a-f0-9-]+$/,
		);
		expect(options).toMatchObject({
			detached: true,
			stdio: "ignore",
			env: { TMPDIR: directory, LANG: "en_US.UTF-8", TZ: "UTC" },
		});
		expect(options?.env).not.toHaveProperty("MEETUP_PASSWORD");
		expect(directory).toBeTruthy();
		expect(profileExists).toBe(false);
	}, 20_000);

	it("removes its private workspace when the browser cannot start", async () => {
		// Arrange
		const launch = vi.fn(spawn);
		const process = new MeetupChromeProcess(
			launch,
			"/nonexistent/synthetic-chrome",
		);

		// Act
		const result = process.start("UTC");

		// Assert
		await expect(result).rejects.toThrow("Browser unavailable.");
		const args = launch.mock.calls[0][1] as string[];
		const directory = args
			.find((arg) => arg.startsWith("--user-data-dir="))
			?.slice("--user-data-dir=".length);
		expect(directory).toBeTruthy();
		await expect(access(directory ?? "")).rejects.toMatchObject({
			code: "ENOENT",
		});
	}, 20_000);
});
