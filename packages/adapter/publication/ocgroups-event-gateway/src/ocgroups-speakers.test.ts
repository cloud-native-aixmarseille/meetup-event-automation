import { chromium, type Browser } from "playwright-core";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
	event,
	installBrowserFixture,
	remote,
} from "../testing/browser-fixture.js";
import { OcgroupsSpeakers } from "./ocgroups-speakers.js";
let browser: Browser;
beforeAll(async () => {
	browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
	await browser.close();
});

describe("OCGroups speakers", () => {
	it("preserves unrelated entries and adds no duplicate on reruns", async () => {
		// Arrange
		const context = await browser.newContext();
		const state = await installBrowserFixture(context, "draft");
		Object.assign(state.fields, {
			"speakers[1][user_id]": "70000000-0000-4000-8000-000000000007",
			"speakers[1][featured]": "true",
		});
		const page = await context.newPage();
		await page.goto(remote.reviewUrl);
		const widget = new OcgroupsSpeakers(page);
		const inputs = page.locator('input[name^="speakers["]');
		const original = await inputs.evaluateAll((elements) =>
			elements.map((e) => (e as HTMLInputElement).outerHTML),
		);
		// Act
		await widget.write([event.speakers[0]]);
		await widget.write([event.speakers[0]]);
		const matches = await widget.matches([event.speakers[0]]);
		const after = await inputs.evaluateAll((elements) =>
			elements.map((e) => (e as HTMLInputElement).outerHTML),
		);
		await context.close();
		// Assert
		expect(matches).toBe(true);
		expect(after).toEqual(original);
		expect(state.saves).toBe(0);
	});
	it("rejects a selected account or sponsor with a different configured UUID", async () => {
		// Arrange
		const context = await browser.newContext();
		await installBrowserFixture(context, "missing");
		const page = await context.newPage();
		page.setDefaultTimeout(500);
		await page.goto(remote.reviewUrl);
		const widget = new OcgroupsSpeakers(page);
		// Act
		const result = widget.write([
			{ ...event.speakers[0], userId: "90000000-0000-4000-8000-000000000009" },
		]);
		// Assert
		await expect(result).rejects.toThrow("verification");
		await context.close();
	});
});
