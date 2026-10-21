import { type Browser, type BrowserContext, chromium } from "playwright-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	desiredEvent,
	editorFixture,
	eventUrl,
	groupUrl,
} from "../testing/editor-fixture.js";
import { MeetupEventGatewayComposition } from "./dependency-composition.js";
import { MeetupEventEditor } from "./meetup-event-editor.js";

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

describe("Meetup browser event editor", () => {
	it("creates a draft without publishing and verifies saved fields", async () => {
		// Arrange
		const state = await editorFixture(context);
		const editor = new MeetupEventEditor(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
				createMeetupCalendar: (...args) =>
					new MeetupEventGatewayComposition().meetupCalendar(...args),
				createMeetupVenue: (...args) =>
					new MeetupEventGatewayComposition().meetupVenue(...args),
			},
			await context.newPage(),
			groupUrl,
		);
		const before = vi.fn().mockResolvedValue(undefined);
		const after = vi.fn().mockResolvedValue(undefined);

		// Act
		const url = await editor.save(desiredEvent, undefined, before, after);

		// Assert
		expect(url).toEqual({ url: eventUrl, status: "draft" });
		expect(state.event).toMatchObject({
			...desiredEvent,
			description: expect.stringMatching(
				/A public description\s+Example Speaker\s+A useful talk/,
			),
		});
		expect(state.writes).toBe(1);
		expect(state.publishClicks).toBe(0);
		expect(before).toHaveBeenCalledOnce();
		expect(after).toHaveBeenCalledWith(eventUrl);
	});

	it.each(["draft", "published"] as const)(
		"updates an existing %s without changing its publication status",
		async (status) => {
			// Arrange
			const state = await editorFixture(
				context,
				{
					...desiredEvent,
					title: "Old title",
				},
				status,
			);
			const editor = new MeetupEventEditor(
				{
					meetupBrowserRoutes:
						new MeetupEventGatewayComposition().meetupBrowserRoutes(),
					createMeetupEventVerification: (...args) =>
						new MeetupEventGatewayComposition().meetupEventVerification(
							...args,
						),
					createMeetupCalendar: (...args) =>
						new MeetupEventGatewayComposition().meetupCalendar(...args),
					createMeetupVenue: (...args) =>
						new MeetupEventGatewayComposition().meetupVenue(...args),
				},
				await context.newPage(),
				groupUrl,
			);
			const before = vi.fn().mockResolvedValue(undefined);
			const after = vi.fn().mockResolvedValue(undefined);

			// Act
			const url = await editor.save(desiredEvent, eventUrl, before, after);

			// Assert
			expect(url).toEqual({ url: eventUrl, status });
			expect(state.writes).toBe(1);
			expect(state.publishClicks).toBe(0);
			expect(state.event?.title).toBe(desiredEvent.title);
		},
	);

	it("does not submit an already synchronized event", async () => {
		// Arrange
		const state = await editorFixture(context, desiredEvent);
		const editor = new MeetupEventEditor(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
				createMeetupCalendar: (...args) =>
					new MeetupEventGatewayComposition().meetupCalendar(...args),
				createMeetupVenue: (...args) =>
					new MeetupEventGatewayComposition().meetupVenue(...args),
			},
			await context.newPage(),
			groupUrl,
		);
		const before = vi.fn();
		const after = vi.fn().mockResolvedValue(undefined);

		// Act
		const url = await editor.save(desiredEvent, eventUrl, before, after);

		// Assert
		expect(url).toEqual({ url: eventUrl, status: "draft" });
		expect(state.writes).toBe(0);
		expect(before).not.toHaveBeenCalled();
	});

	it("does not save when the source guard rejects the write", async () => {
		// Arrange
		const state = await editorFixture(context);
		const editor = new MeetupEventEditor(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
				createMeetupCalendar: (...args) =>
					new MeetupEventGatewayComposition().meetupCalendar(...args),
				createMeetupVenue: (...args) =>
					new MeetupEventGatewayComposition().meetupVenue(...args),
			},
			await context.newPage(),
			groupUrl,
		);
		const before = vi
			.fn()
			.mockRejectedValue(new Error("Concurrent source edit"));
		const after = vi.fn();

		// Act
		const result = editor.save(desiredEvent, undefined, before, after);

		// Assert
		await expect(result).rejects.toThrow("Concurrent source edit");
		expect(state.writes).toBe(0);
		expect(after).not.toHaveBeenCalled();
	});

	it.each([
		{ title: "Unexpected saved title" },
		{ description: "Incomplete agenda" },
		{ date: "2026-11-21" },
		{ startTime: "19:00" },
		{ endTime: "21:00" },
		{ venue: { name: "Other Venue", city: "Example City" } },
		{ venue: { name: "Example Venue", city: "Other City" } },
	])(
		"records identity but rejects incorrect saved fields %j",
		async (corruption) => {
			// Arrange
			const state = await editorFixture(context);
			state.corruptSaved = corruption;
			const editor = new MeetupEventEditor(
				{
					meetupBrowserRoutes:
						new MeetupEventGatewayComposition().meetupBrowserRoutes(),
					createMeetupEventVerification: (...args) =>
						new MeetupEventGatewayComposition().meetupEventVerification(
							...args,
						),
					createMeetupCalendar: (...args) =>
						new MeetupEventGatewayComposition().meetupCalendar(...args),
					createMeetupVenue: (...args) =>
						new MeetupEventGatewayComposition().meetupVenue(...args),
				},
				await context.newPage(),
				groupUrl,
			);
			const before = vi.fn().mockResolvedValue(undefined);
			const after = vi.fn().mockResolvedValue(undefined);

			// Act
			const result = editor.save(desiredEvent, undefined, before, after);

			// Assert
			await expect(result).rejects.toMatchObject({ kind: "verification" });
			expect(after).toHaveBeenCalledWith(eventUrl);
			expect(state.writes).toBe(1);
			expect(state.publishClicks).toBe(0);
		},
	);

	it("does not fall back to Publish when draft saving is unavailable", async () => {
		// Arrange
		const state = await editorFixture(context);
		state.previewAvailable = false;
		const page = await context.newPage();
		const editor = new MeetupEventEditor(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
				createMeetupCalendar: (...args) =>
					new MeetupEventGatewayComposition().meetupCalendar(...args),
				createMeetupVenue: (...args) =>
					new MeetupEventGatewayComposition().meetupVenue(...args),
			},
			page,
			groupUrl,
		);
		const beforeSubmit = vi.fn(async () => {
			page.setDefaultTimeout(200);
		});
		const after = vi.fn();

		// Act
		const result = editor.save(desiredEvent, undefined, beforeSubmit, after);

		// Assert
		await expect(result).rejects.toMatchObject({ kind: "uncertain" });
		expect(beforeSubmit).toHaveBeenCalledOnce();
		expect(state.writes).toBe(0);
		expect(state.publishClicks).toBe(0);
		expect(after).not.toHaveBeenCalled();
	});

	it("reuses the draft identity on reruns without publishing or saving again", async () => {
		// Arrange
		const state = await editorFixture(context);
		const editor = new MeetupEventEditor(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
				createMeetupCalendar: (...args) =>
					new MeetupEventGatewayComposition().meetupCalendar(...args),
				createMeetupVenue: (...args) =>
					new MeetupEventGatewayComposition().meetupVenue(...args),
			},
			await context.newPage(),
			groupUrl,
		);
		const after = vi.fn();

		// Act
		const created = await editor.save(desiredEvent, undefined, vi.fn(), after);
		const repeated = await editor.save(
			desiredEvent,
			created.url,
			vi.fn(),
			after,
		);

		// Assert
		expect(repeated).toEqual(created);
		expect(repeated.status).toBe("draft");
		expect(state.writes).toBe(1);
		expect(state.publishClicks).toBe(0);
	});

	it.each([
		"https://www.meetup.com/other/events/12345/",
		`${eventUrl}?token=private`,
		`${eventUrl}#details`,
		"https://www.meetup.com/example-group/events/0123/",
		"not a URL",
	])("rejects invalid event links without navigation: %s", async (url) => {
		// Arrange
		const state = await editorFixture(context);
		const page = await context.newPage();
		const editor = new MeetupEventEditor(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					new MeetupEventGatewayComposition().meetupEventVerification(...args),
				createMeetupCalendar: (...args) =>
					new MeetupEventGatewayComposition().meetupCalendar(...args),
				createMeetupVenue: (...args) =>
					new MeetupEventGatewayComposition().meetupVenue(...args),
			},
			page,
			groupUrl,
		);

		// Act
		const result = editor.save(desiredEvent, url, vi.fn(), vi.fn());

		// Assert
		await expect(result).rejects.toMatchObject({ kind: "editor" });
		expect(page.url()).toBe("about:blank");
		expect(state.writes).toBe(0);
	});
});
