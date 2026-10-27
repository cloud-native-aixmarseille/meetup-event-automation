import { LocalizationComposition } from "@meetup-automation/localization";
import { MeetupGroupUrl } from "@meetup-automation/publication";
import { type Browser, type BrowserContext, chromium } from "playwright-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attendeeMessageFixture } from "../testing/attendee-message-fixture.js";
import { eventUrl, groupUrl } from "../testing/editor-fixture.js";
import { AttendeeMessages } from "./i18n/attendee-messages.js";
import { MeetupAttendeeMessage } from "./meetup-attendee-message.js";

let browser: Browser;
let context: BrowserContext;
beforeEach(async () => {
	browser = await chromium.launch({ headless: true });
	context = await browser.newContext();
});
afterEach(async () => {
	await context?.close();
	await browser?.close();
});
async function sender(locale: string) {
	const group = MeetupGroupUrl.parse(groupUrl);
	if (!group) throw new Error("Invalid test group");
	return new MeetupAttendeeMessage(
		new AttendeeMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			locale,
		),
		await context.newPage(),
		group,
	);
}
const pdfUrl = "https://drive.google.com/file/d/public-pdf/view";
describe("Meetup attendee message", () => {
	it("sends the requested French message to attendees after clearing other RSVP filters", async () => {
		// Arrange
		const state = await attendeeMessageFixture(context);
		const operation = await sender("fr");
		const beforeSend = vi.fn(async () => {
			expect(state.sends).toHaveLength(0);
		});
		// Act
		await operation.send(eventUrl, pdfUrl, beforeSend);
		// Assert
		expect(beforeSend).toHaveBeenCalledOnce();
		expect(state.sends).toEqual([
			{
				eventId: "12345",
				audience: "subscribers",
				statuses: ["ATTENDED"],
				subject: "Présentation du meetup",
				message: `Bonjour, voici le lien vers les slides du meetup: ${pdfUrl}`,
			},
		]);
	});
	it("does not send when another RSVP filter cannot be cleared", async () => {
		// Arrange
		const state = await attendeeMessageFixture(context);
		state.stickyRsvp = true;
		const operation = await sender("fr");
		const guard = vi.fn();
		// Act
		const result = operation.send(eventUrl, pdfUrl, guard);
		// Assert
		await expect(result).rejects.toThrow();
		expect(guard).not.toHaveBeenCalled();
		expect(state.sends).toEqual([]);
	});
	it("uses the configured English locale", async () => {
		// Arrange
		const state = await attendeeMessageFixture(context);
		const operation = await sender("en");
		// Act
		await operation.send(eventUrl, pdfUrl, async () => {});
		// Assert
		expect(state.sends[0]).toMatchObject({
			subject: "Meetup presentation",
			message: `Hello, here is the link to the meetup slides: ${pdfUrl}`,
		});
	});
	it("never submits when the final source or delivery guard fails", async () => {
		// Arrange
		const state = await attendeeMessageFixture(context);
		const operation = await sender("fr");
		// Act
		const result = operation.send(eventUrl, pdfUrl, async () => {
			throw new Error("Source changed");
		});
		// Assert
		await expect(result).rejects.toThrow("Source changed");
		expect(state.sends).toEqual([]);
	});
	it.each([
		`${groupUrl}messages/send/?eventId=99999`,
		"https://www.meetup.com/other-group/messages/send/?eventId=12345",
	])(
		"rejects a contact form outside the event scope: %s",
		async (contactUrl) => {
			// Arrange
			const state = await attendeeMessageFixture(context);
			state.redirectUrl = contactUrl;
			const operation = await sender("fr");
			const guard = vi.fn();
			// Act
			const result = operation.send(eventUrl, pdfUrl, guard);
			// Assert
			await expect(result).rejects.toMatchObject({ kind: "verification" });
			expect(guard).not.toHaveBeenCalled();
			expect(state.sends).toEqual([]);
		},
	);
});
