import { type Browser, chromium } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { spawnTestChromium } from "../testing/chromium-process.js";
import { MeetupBrowserSession } from "./meetup-browser-session.js";
import { MeetupChromeProcess } from "./meetup-chrome-process.js";

describe("Meetup browser session", () => {
	it("applies the event timezone and discards authentication state between sessions", async () => {
		// Arrange
		const first = new MeetupBrowserSession(
			chromium,
			new MeetupChromeProcess(spawnTestChromium, chromium.executablePath()),
		);
		const second = new MeetupBrowserSession(
			chromium,
			new MeetupChromeProcess(spawnTestChromium, chromium.executablePath()),
		);
		let timezone = "";
		let viewport = null;
		let freshCookies = 1;

		// Act
		try {
			const { page, endpoint } = await first.open("Europe/Paris");
			await page.route("https://example.test/**", (route) =>
				route.fulfill({
					contentType: "text/html",
					body: "<html><body>synthetic page</body></html>",
				}),
			);
			await page.goto("https://example.test/");
			const attached = await chromium.connectOverCDP(endpoint);
			await attached.close();
			timezone = await page.evaluate(
				() => Intl.DateTimeFormat().resolvedOptions().timeZone,
			);
			viewport = await page.evaluate(() => ({
				width: innerWidth,
				height: innerHeight,
			}));
			await page.context().addCookies([
				{
					name: "synthetic-session",
					value: "private",
					domain: "example.test",
					path: "/",
				},
			]);
			await first.close();
			const fresh = await second.open("UTC");
			freshCookies = (await fresh.page.context().cookies()).length;
		} finally {
			await first.close();
			await second.close();
		}

		// Assert
		expect(timezone).toBe("Europe/Paris");
		expect(viewport).toEqual({ width: 1440, height: 1000 });
		expect(freshCookies).toBe(0);
	}, 30_000);

	it("disposes the process and redacts a connection failure", async () => {
		// Arrange
		const process = {
			start: vi
				.fn()
				.mockResolvedValue("ws://127.0.0.1:1234/devtools/browser/abc"),
			close: vi.fn(),
		};
		const connectOverCDP = vi
			.fn()
			.mockRejectedValue(new Error("private browser data"));
		const session = new MeetupBrowserSession({ connectOverCDP }, process);

		// Act
		const result = session.open("UTC");

		// Assert
		await expect(result).rejects.toThrow("Browser session unavailable.");
		expect(process.close).toHaveBeenCalledOnce();
	});

	it("rejects an unexpected browser page set and closes both owners", async () => {
		// Arrange
		const process = {
			start: vi
				.fn()
				.mockResolvedValue("ws://127.0.0.1:1234/devtools/browser/abc"),
			close: vi.fn(),
		};
		const browser = { contexts: () => [{ pages: () => [] }], close: vi.fn() };
		const session = new MeetupBrowserSession(
			{
				connectOverCDP: vi
					.fn()
					.mockResolvedValue(browser as unknown as Browser),
			},
			process,
		);

		// Act
		const result = session.open("UTC");

		// Assert
		await expect(result).rejects.toThrow("Browser session unavailable.");
		expect(browser.close).toHaveBeenCalledOnce();
		expect(process.close).toHaveBeenCalledOnce();
	});
});
