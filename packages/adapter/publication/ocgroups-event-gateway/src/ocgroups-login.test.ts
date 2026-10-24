import { type Browser, chromium } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installBrowserFixture, origin } from "../testing/browser-fixture.js";
import { OcgroupsLogin } from "./ocgroups-login.js";

let browser: Browser;
beforeAll(async () => {
	browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
	await browser?.close();
});
describe("OCGroups login", () => {
	it("verifies the organizer username after signing in", async () => {
		// Arrange
		const context = await browser.newContext();
		await installBrowserFixture(context);
		const page = await context.newPage();
		page.setDefaultTimeout(500);
		const login = new OcgroupsLogin(page, origin);
		// Act
		await login.login("example-organizer", "synthetic-password");
		const verified = await page
			.locator('#user-dropdown-button[data-logged-in="true"]')
			.count();
		await context.close();
		// Assert
		expect(verified).toBe(1);
	});
	it("rejects a different authenticated account", async () => {
		// Arrange
		const context = await browser.newContext();
		const state = await installBrowserFixture(context);
		state.username = "another-organizer";
		const page = await context.newPage();
		page.setDefaultTimeout(500);
		const login = new OcgroupsLogin(page, origin);
		// Act
		const result = login.login("example-organizer", "synthetic-password");
		// Assert
		await expect(result).rejects.toThrow("authentication");
		await context.close();
	});
	it.each([
		'<input autocomplete="one-time-code">',
		'<iframe src="https://captcha.example.test/"></iframe>',
		'<a href="/log-in/oidc/provider">SSO</a>',
	])(
		"rejects unsupported authentication before entering credentials: %s",
		async (challenge) => {
			// Arrange
			const context = await browser.newContext();
			const page = await context.newPage();
			page.setDefaultTimeout(200);
			await context.route("**/*", (route) =>
				route.fulfill({ contentType: "text/html", body: challenge }),
			);
			const login = new OcgroupsLogin(page, origin);
			// Act
			const result = login.login("example-organizer", "synthetic-password");
			// Assert
			await expect(result).rejects.toThrow("authentication");
			await context.close();
		},
	);
});
