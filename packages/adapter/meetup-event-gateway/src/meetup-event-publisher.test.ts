import { type Browser, type BrowserContext, chromium } from "playwright-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	desiredEvent,
	editorFixture,
	eventUrl,
	groupUrl,
} from "../testing/editor-fixture.js";
import { MeetupEventGatewayComposition } from "./dependency-composition.js";
import { MeetupEventPublisher } from "./meetup-event-publisher.js";

let browser: Browser;
let context: BrowserContext;
beforeEach(async () => {
	browser = await chromium.launch({ headless: true });
	context = await browser.newContext({
		locale: "en-US",
		timezoneId: "Europe/Paris",
	});
});
afterEach(async () => {
	await context?.close();
	await browser?.close();
});

describe("approved Meetup publication", () => {
	it("publishes the verified draft after the guard and skips a published rerun", async () => {
		// Arrange
		const state = await editorFixture(context, desiredEvent);
		const publisher = new MeetupEventPublisher(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
			},
			await context.newPage(),
			groupUrl,
		);
		const guard = vi.fn(async () => {
			expect(state.publishClicks).toBe(0);
		});

		// Act
		const result = await publisher.publish(desiredEvent, eventUrl, guard);
		const repeat = await publisher.publish(desiredEvent, eventUrl, guard);

		// Assert
		expect(result).toEqual({ url: eventUrl, status: "published" });
		expect(repeat).toEqual(result);
		expect(guard).toHaveBeenCalledOnce();
		expect(state.publishClicks).toBe(1);
	});
	it("does not click Publish when the approval guard rejects", async () => {
		// Arrange
		const state = await editorFixture(context, desiredEvent);
		const publisher = new MeetupEventPublisher(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
			},
			await context.newPage(),
			groupUrl,
		);
		const guard = vi.fn().mockRejectedValue(new Error("Approval invalidated"));

		// Act
		const result = publisher.publish(desiredEvent, eventUrl, guard);

		// Assert
		await expect(result).rejects.toThrow("Approval invalidated");
		expect(state.publishClicks).toBe(0);
	});
	it("rejects remote content that differs from the approved draft", async () => {
		// Arrange
		const state = await editorFixture(context, {
			...desiredEvent,
			title: "Remote edit",
		});
		const publisher = new MeetupEventPublisher(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
			},
			await context.newPage(),
			groupUrl,
		);
		const guard = vi.fn();

		// Act
		const result = publisher.publish(desiredEvent, eventUrl, guard);

		// Assert
		await expect(result).rejects.toMatchObject({ kind: "verification" });
		expect(state.publishClicks).toBe(0);
		expect(guard).not.toHaveBeenCalled();
	});
	it("requires verified saved fields after publication", async () => {
		// Arrange
		const state = await editorFixture(context, desiredEvent);
		state.corruptSaved = { title: "Unexpected saved title" };
		const publisher = new MeetupEventPublisher(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
			},
			await context.newPage(),
			groupUrl,
		);

		// Act
		const result = publisher.publish(desiredEvent, eventUrl, vi.fn());

		// Assert
		await expect(result).rejects.toMatchObject({ kind: "verification" });
		expect(state.publishClicks).toBe(1);
	});
	it.each([
		"https://www.meetup.com/other/events/12345/",
		`${eventUrl}?token=private`,
		eventUrl.slice(0, -1),
	])(
		"rejects identities outside the canonical approval contract: %s",
		async (url) => {
			// Arrange
			const page = await context.newPage();
			const publisher = new MeetupEventPublisher(
				{
					meetupBrowserRoutes:
						new MeetupEventGatewayComposition().meetupBrowserRoutes(),
					createMeetupEventVerification: (...args) =>
						new MeetupEventGatewayComposition().meetupEventVerification(
							...args,
						),
				},
				page,
				groupUrl,
			);

			// Act
			const result = publisher.publish(desiredEvent, url, vi.fn());

			// Assert
			await expect(result).rejects.toMatchObject({ kind: "editor" });
			expect(page.url()).toBe("about:blank");
		},
	);
});
