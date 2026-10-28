import { chromium } from "playwright-core";
import { describe, expect, it } from "vitest";
import { cover, coverImage } from "../testing/cover-fixture.js";
import {
	desiredEvent,
	editorFixture,
	eventUrl,
} from "../testing/editor-fixture.js";
import { MeetupCoverPhoto } from "./meetup-cover-photo.js";

describe("Meetup cover photo controls", () => {
	it.each([false, true])(
		"uploads and observes the provider photo identity with existing cover=%s",
		async (existing) => {
			// Arrange
			const browser = await chromium.launch();
			try {
				const context = await browser.newContext();
				const state = await editorFixture(
					context,
					existing ? desiredEvent : undefined,
				);
				const page = await context.newPage();
				await page.goto(`${eventUrl}edit/`);
				const photo = new MeetupCoverPhoto(page);
				// Act
				const saved = await photo.upload(coverImage, cover.fingerprint);
				const observed = await photo.current();
				// Assert
				expect(saved).toBe("102");
				expect(observed).toBe(saved);
				expect(state.uploads).toBe(1);
				expect(state.writes).toBe(0);
			} finally {
				await browser.close();
			}
		},
	);
});
