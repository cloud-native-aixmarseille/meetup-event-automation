import { MeetupGroupUrl } from "@meetup-automation/publication";
import { chromium } from "playwright-core";
import { expect, it } from "vitest";
import {
	editorFixture,
	eventUrl,
	groupUrl,
} from "../testing/editor-fixture.js";
import { MeetupHosts } from "./meetup-hosts.js";
import { MeetupLeadership } from "./meetup-leadership.js";

it("adds every leader once and preserves manually selected hosts", async () => {
	// Arrange
	const browser = await chromium.launch({ headless: true });
	try {
		const context = await browser.newContext();
		const state = await editorFixture(context);
		state.hosts = ["First Leader", "Guest Host"];
		const page = await context.newPage();
		await page.goto(`${eventUrl}edit/`);
		const group = MeetupGroupUrl.parse(groupUrl);
		if (!group) throw new Error("Invalid synthetic group");
		const hosts = new MeetupHosts(page, new MeetupLeadership(page));

		// Act
		const initial = await hosts.matches(group, undefined);
		const selected = await hosts.select(group);
		const retried = await hosts.select(group);
		const matches = await hosts.matches(group, selected);

		// Assert
		expect(initial).toBe(false);
		expect(selected).toEqual(["First Leader", "Guest Host", "Second Leader"]);
		expect(retried).toEqual(selected);
		expect(matches).toBe(true);
		expect(state.writes).toBe(0);
	} finally {
		await browser.close();
	}
});
