import { type Browser, chromium } from "playwright-core";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
	event,
	installBrowserFixture,
	origin,
} from "../testing/browser-fixture.js";
import { OcgroupsRegistration } from "./ocgroups-registration.js";

let browser: Browser;
beforeAll(async () => {
	browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
	await browser?.close();
});

it("rejects a locked nonzero ticket price", async () => {
	// Arrange
	const context = await browser.newContext();
	const page = await context.newPage();
	page.setDefaultTimeout(500);
	await installBrowserFixture(context);
	await page.goto(`${origin}/dashboard/group/events/add`);
	await page
		.locator('[data-ticket-window-field="amount"]')
		.evaluate((element) => {
			(element as HTMLInputElement).value = "10";
		});
	const registration = new OcgroupsRegistration(page);

	// Act
	const result = registration.create(event.registration);

	// Assert
	await expect(result).rejects.toThrow("verification");
	await context.close();
});

it.each([true, false])(
	"sets styled registration switches with waitlist %s",
	async (waitlist) => {
		// Arrange
		const context = await browser.newContext();
		const page = await context.newPage();
		page.setDefaultTimeout(500);
		const state = await installBrowserFixture(context);
		state.fields.test_event = "true";
		state.fields.waitlist_enabled = String(!waitlist);
		state.fields.attendee_approval_required = String(waitlist);
		state.fields.event_reminder_enabled = String(!waitlist);
		const settings = {
			...event.registration,
			waitlist,
			approvalRequired: !waitlist,
			reminder: waitlist,
		};
		await page.goto(`${origin}/dashboard/group/events/add`);
		const registration = new OcgroupsRegistration(page);

		// Act
		await registration.create(settings);
		await registration.verify(settings);
		const ticketActive = await page
			.locator('[data-ticket-field="active"]')
			.isChecked();
		await context.close();

		// Assert
		expect(ticketActive).toBe(true);
	},
);
