import { type Browser, chromium } from "playwright-core";
import { afterEach, beforeEach, expect, it } from "vitest";
import {
	desiredEvent,
	editorFixture,
	eventUrl,
} from "../../packages/adapter/publication/meetup-event-gateway/testing/editor-fixture.js";

let browser: Browser;
beforeEach(async () => {
	browser = await chromium.launch({ headless: true });
});
afterEach(async () => {
	await browser?.close();
});

it.each(["title", "date", "endDate"])(
	"preserves script-like %s values as data in the synthetic editor",
	async (field) => {
		// Arrange
		const value =
			"été \"'\\</ScRiPt><script>document.body.dataset.injected='true'</script>\u2028\u2029";
		const event = { ...desiredEvent, [field]: value };
		const context = await browser.newContext();
		const state = await editorFixture(context, event);
		state.hydrationDelay = 50;
		const page = await context.newPage();
		page.setDefaultTimeout(3_000);
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));

		// Act
		await page.goto(`${eventUrl}edit/`);
		await page.waitForFunction(
			(title) =>
				document.querySelector<HTMLInputElement>(
					'[data-testid="event-name-input"]',
				)?.value === title,
			event.title,
		);
		const injected = await page.locator("body").getAttribute("data-injected");
		await page.getByTestId("event-preview-btn").click();
		await page.waitForURL(eventUrl);

		// Assert
		expect(injected).toBeNull();
		expect(errors).toEqual([]);
		expect(state.writes).toBe(1);
		expect(state.event).toMatchObject({ [field]: value });
	},
);
