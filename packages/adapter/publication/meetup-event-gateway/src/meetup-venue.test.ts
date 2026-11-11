import { chromium } from "playwright-core";
import { expect, it } from "vitest";
import { MeetupVenue } from "./meetup-venue.js";

it("ignores hidden city text when matching the selected venue", async () => {
	// Arrange
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		await page.setContent(`
			<div>
				<div><h3>Example Venue</h3></div>
				<p>Other City</p>
				<p hidden>Example City</p>
			</div>
		`);
		const venue = new MeetupVenue(page);

		// Act
		const matches = await venue.matches({
			name: "Example Venue",
			city: "Example City",
		});

		// Assert
		expect(matches).toBe(false);
	} finally {
		await browser.close();
	}
});
