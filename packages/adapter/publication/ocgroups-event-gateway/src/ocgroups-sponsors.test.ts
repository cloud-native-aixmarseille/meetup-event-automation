import { chromium, type Browser } from "playwright-core";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
	event,
	installBrowserFixture,
	remote,
} from "../testing/browser-fixture.js";
import { OcgroupsSponsors } from "./ocgroups-sponsors.js";
let browser: Browser;
beforeAll(async () => {
	browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
	await browser.close();
});

describe("OCGroups sponsors", () => {
	it("preserves unrelated entries and adds no duplicate on reruns", async () => {
		// Arrange
		const context = await browser.newContext();
		const state = await installBrowserFixture(context, "draft");
		Object.assign(state.fields, {
			"sponsors[1][group_sponsor_id]": "80000000-0000-4000-8000-000000000008",
			"sponsors[1][level]": "Community",
		});
		const page = await context.newPage();
		await page.goto(remote.reviewUrl);
		const widget = new OcgroupsSponsors(page);
		const inputs = page.locator('input[name^="sponsors["]');
		const original = await inputs.evaluateAll((elements) =>
			elements.map((e) => (e as HTMLInputElement).outerHTML),
		);
		// Act
		await widget.write(event.sponsor);
		await widget.write(event.sponsor);
		const matches = await widget.matches(event.sponsor);
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
		const widget = new OcgroupsSponsors(page);
		// Act
		const result = widget.write({
			...event.sponsor,
			id: "90000000-0000-4000-8000-000000000009",
		});
		// Assert
		await expect(result).rejects.toThrow("verification");
		await context.close();
	});
});
