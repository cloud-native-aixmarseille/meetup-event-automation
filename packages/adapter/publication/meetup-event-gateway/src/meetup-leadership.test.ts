import { MeetupGroupUrl } from "@meetup-automation/publication";
import { chromium } from "playwright-core";
import { expect, it } from "vitest";
import { editorFixture, groupUrl } from "../testing/editor-fixture.js";
import { MeetupLeadership } from "./meetup-leadership.js";

it.each([640, 1280])(
	"reads all leadership pages at %i pixels and closes its separate page",
	async (width) => {
		// Arrange
		const browser = await chromium.launch({ headless: true });
		try {
			const context = await browser.newContext({
				viewport: { width, height: 720 },
			});
			const state = await editorFixture(context);
			state.leaders = [
				"Leader One",
				"Leader Two",
				"Leader Three",
				"Leader Four",
				"Leader Five",
			];
			state.leaderPageSize = 2;
			const page = await context.newPage();
			const group = MeetupGroupUrl.parse(groupUrl);
			if (!group) throw new Error("Invalid synthetic group");
			const leadership = new MeetupLeadership(page);

			// Act
			const members = await leadership.members(group);

			// Assert
			expect(members).toEqual(state.leaders);
			expect(context.pages()).toEqual([page]);
			expect(state.writes).toBe(0);
		} finally {
			await browser.close();
		}
	},
);
