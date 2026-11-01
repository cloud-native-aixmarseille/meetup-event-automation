import { MeetupSessionCodec } from "./meetup-session-codec.js";
import { type Browser, chromium } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { spawnTestChromium } from "../testing/chromium-process.js";
import { MeetupBrowserSession } from "./meetup-browser-session.js";
import { MeetupChromeProcess } from "./meetup-chrome-process.js";

describe("Meetup browser session", () => {
	it("shares authentication with additional pages in the disposable profile", async () => {
		// Arrange
		const session = new MeetupBrowserSession(
			chromium,
			new MeetupChromeProcess(spawnTestChromium, chromium.executablePath()),
		);
		let sharedCookie = "";

		// Act
		try {
			const { page } = await session.open("UTC");
			await page.context().route("https://example.test/**", async (route) => {
				const account = new URL(route.request().url()).pathname === "/account";
				if (!account) sharedCookie = route.request().headers().cookie ?? "";
				await route.fulfill({
					contentType: "text/html",
					headers: account
						? {
								"set-cookie":
									"synthetic-session=private; Path=/; Secure; HttpOnly",
							}
						: {},
					body: "<html><body>synthetic page</body></html>",
				});
			});
			await page.goto("https://example.test/account");
			const roster = await page.context().newPage();
			await roster.goto("https://example.test/members");
		} finally {
			await session.close();
		}

		// Assert
		expect(sharedCookie).toBe("synthetic-session=private");
	}, 30_000);

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

it("restores verified cookies and local storage into a fresh browser profile", async () => {
	// Arrange
	const first = new MeetupBrowserSession(
		chromium,
		new MeetupChromeProcess(spawnTestChromium, chromium.executablePath()),
	);
	const second = new MeetupBrowserSession(
		chromium,
		new MeetupChromeProcess(spawnTestChromium, chromium.executablePath()),
	);
	const codec = new MeetupSessionCodec(
		"synthetic-api-secret",
		"repo/account/password",
		"https://example.test",
		Date.now,
	);
	let cookie = "";
	let token = "";

	// Act
	try {
		const initial = await first.open("UTC");
		await initial.page.route("https://example.test/**", (route) =>
			route.fulfill({
				contentType: "text/html",
				body: "<html>synthetic account</html>",
			}),
		);
		await initial.page.goto("https://example.test/account");
		await initial.page.context().addCookies([
			{
				name: "session",
				value: "synthetic-cookie",
				domain: "example.test",
				path: "/",
				httpOnly: true,
				secure: true,
			},
		]);
		await initial.page.evaluate(() =>
			localStorage.setItem("account-token", "synthetic-token"),
		);
		const encrypted = codec.encode(await initial.page.context().storageState());
		await first.close();
		const restored = codec.decode(encrypted);
		if (!restored) throw new Error("Synthetic session was not decoded");
		const next = await second.open("Europe/Paris");
		await next.page.context().setStorageState(restored);
		await next.page.route("https://example.test/**", (route) => {
			cookie = route.request().headers().cookie ?? "";
			return route.fulfill({
				contentType: "text/html",
				body: "<html>synthetic account</html>",
			});
		});
		await next.page.goto("https://example.test/account");
		token = await next.page.evaluate(
			() => localStorage.getItem("account-token") ?? "",
		);
	} finally {
		await first.close();
		await second.close();
	}

	// Assert
	expect(cookie).toBe("session=synthetic-cookie");
	expect(token).toBe("synthetic-token");
}, 30_000);
