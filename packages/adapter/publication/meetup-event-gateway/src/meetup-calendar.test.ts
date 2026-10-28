import { type Browser, chromium } from "playwright-core";
import { afterEach, expect, it } from "vitest";
import {
	desiredEvent,
	editorFixture,
	groupUrl,
} from "../testing/editor-fixture.js";
import { MeetupCalendar } from "./meetup-calendar.js";

let browser: Browser;
afterEach(async () => {
	await browser?.close();
});

it("uses date popup triggers when another control has the same accessible name", async () => {
	// Arrange
	browser = await chromium.launch({ headless: true });
	const context = await browser.newContext();
	const state = await editorFixture(context);
	const page = await context.newPage();
	await page.goto(`${groupUrl}schedule/`);
	await page.evaluate(() => {
		const duplicate = document.createElement("button");
		duplicate.setAttribute("aria-label", "Open end date picker");
		duplicate.dataset.testid = "unrelated-date-control";
		duplicate.onclick = () => {
			duplicate.dataset.clicked = "true";
		};
		document.body.append(duplicate);
	});
	const calendar = new MeetupCalendar(page);

	// Act
	await calendar.fill(
		desiredEvent.date,
		desiredEvent.startTime,
		desiredEvent.endTime,
	);
	const matches = await calendar.matches(
		desiredEvent.date,
		desiredEvent.startTime,
		desiredEvent.endTime,
	);
	const unrelatedClicked = await page
		.getByTestId("unrelated-date-control")
		.getAttribute("data-clicked");

	// Assert
	expect(matches).toBe(true);
	expect(unrelatedClicked).toBeNull();
	expect(state.writes).toBe(0);
});
