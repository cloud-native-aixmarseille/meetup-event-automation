import { chromium } from "playwright-core";
import { expect, it } from "vitest";
import {
	desiredEvent,
	editorFixture,
	eventUrl,
} from "../testing/editor-fixture.js";
import { MeetupTopics } from "./meetup-topics.js";

it("selects relevant suggestions and preserves them without generating again", async () => {
	// Arrange
	const browser = await chromium.launch({ headless: true });
	try {
		const context = await browser.newContext();
		const state = await editorFixture(context);
		const page = await context.newPage();
		await page.goto(`${eventUrl}edit/`);
		const topics = new MeetupTopics(page, state.topicSelection);

		// Act
		const selected = await topics.select(desiredEvent);
		const retained = await topics.select(desiredEvent);
		const matches = await topics.matches(selected);

		// Assert
		expect(selected).toEqual(["Cloud Computing", "Containers"]);
		expect(retained).toEqual(selected);
		expect(matches).toBe(true);
		expect(state.topicSelection.select).toHaveBeenCalledOnce();
		expect(state.writes).toBe(0);
	} finally {
		await browser.close();
	}
});

it("rejects a generated topic absent from provider suggestions before changing the form", async () => {
	// Arrange
	const browser = await chromium.launch({ headless: true });
	try {
		const context = await browser.newContext();
		const state = await editorFixture(context);
		state.topicSelection.select.mockResolvedValue(["Invented"]);
		const page = await context.newPage();
		await page.goto(`${eventUrl}edit/`);
		const topics = new MeetupTopics(page, state.topicSelection);

		// Act
		const result = await topics.select(desiredEvent).catch((error) => error);
		const selectedCount = await page
			.getByRole("button", { pressed: true })
			.count();

		// Assert
		expect(result).toEqual(new Error("Invalid Meetup topic selection"));
		expect(selectedCount).toBe(0);
		expect(state.writes).toBe(0);
	} finally {
		await browser.close();
	}
});
