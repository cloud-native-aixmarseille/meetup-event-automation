import type { Browser, BrowserType, Page } from "playwright-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { desiredEvent, eventUrl, groupUrl } from "../testing/editor-fixture.js";
import { MeetupEventGatewayComposition } from "./dependency-composition.js";
import { MeetupEventEditor } from "./meetup-event-editor.js";
import { MeetupEventGateway } from "./meetup-event-gateway.js";
import { MeetupEventPublisher } from "./meetup-event-publisher.js";
import {
	MeetupLoginPage,
	type MeetupLoginPageArguments,
} from "./meetup-login-page.js";

afterEach(() => vi.restoreAllMocks());

function fixture(configuredGroup = groupUrl) {
	const page = {
		setDefaultTimeout: vi.fn(),
		setDefaultNavigationTimeout: vi.fn(),
	} as unknown as Page;
	const browser = {
		newContext: vi
			.fn()
			.mockResolvedValue({ newPage: vi.fn().mockResolvedValue(page) }),
		close: vi.fn().mockResolvedValue(undefined),
	};
	const launch = vi.fn().mockResolvedValue(browser as unknown as Browser);
	const login = vi
		.spyOn(MeetupLoginPage.prototype, "login")
		.mockResolvedValue("verified");
	const save = vi
		.spyOn(MeetupEventEditor.prototype, "save")
		.mockResolvedValue({ url: eventUrl, status: "draft" });
	const createLogin = vi.fn((...args: MeetupLoginPageArguments) =>
		new MeetupEventGatewayComposition().meetupLoginPage(...args),
	);
	const challenge = { solve: vi.fn() };
	const gateway = new MeetupEventGateway(
		{
			createMeetupEventEditor: (...args) =>
				new MeetupEventGatewayComposition().meetupEventEditor(...args),
			createMeetupEventPublisher: (...args) =>
				new MeetupEventGatewayComposition().meetupEventPublisher(...args),
			createMeetupLoginPage: createLogin,
		},
		{ launch } as unknown as BrowserType,
		{ email: "organizer@example.test", password: " synthetic-password " },
		challenge,
		configuredGroup,
	);
	return {
		gateway,
		browser,
		launch,
		login,
		save,
		createLogin,
		page,
		challenge,
	};
}

describe("Meetup event browser session", () => {
	it.each([groupUrl, "https://events.example.test:8443/example-group/"])(
		"uses the configured origin for authentication and disposes the browser: %s",
		async (configuredGroup) => {
			// Arrange
			const {
				gateway,
				browser,
				launch,
				login,
				save,
				createLogin,
				page,
				challenge,
			} = fixture(configuredGroup);
			const before = vi.fn();
			const after = vi.fn();

			// Act
			const result = await gateway.save(desiredEvent, undefined, before, after);

			// Assert
			expect(result).toEqual({ url: eventUrl, status: "draft" });
			expect(launch).toHaveBeenCalledWith(
				expect.objectContaining({
					args: [
						"--enable-automation",
						"--remote-debugging-address=127.0.0.1",
						"--remote-debugging-port=0",
					],
				}),
			);
			expect(browser.newContext).toHaveBeenCalledWith(
				expect.objectContaining({
					locale: "en-US",
					timezoneId: "Europe/Paris",
				}),
			);
			expect(login).toHaveBeenCalledWith(
				"organizer@example.test",
				" synthetic-password ",
			);
			expect(save).toHaveBeenCalledWith(desiredEvent, undefined, before, after);
			expect(browser.close).toHaveBeenCalledOnce();
			expect(createLogin).toHaveBeenCalledExactlyOnceWith(
				page,
				challenge,
				new URL(configuredGroup).origin,
			);
		},
	);

	it.each([
		"challenge-required",
		"credentials-rejected",
		"session-not-reusable",
	] as const)("does not save when login returns %s", async (status) => {
		// Arrange
		const { gateway, browser, login, save } = fixture();
		login.mockResolvedValue(status);

		// Act
		const result = gateway.save(desiredEvent, undefined, vi.fn(), vi.fn());

		// Assert
		await expect(result).rejects.toMatchObject({ kind: "authentication" });
		expect(save).not.toHaveBeenCalled();
		expect(browser.close).toHaveBeenCalledOnce();
	});

	it("does not expose a provider exception or override the result on cleanup failure", async () => {
		// Arrange
		const { gateway, browser, login } = fixture();
		login.mockRejectedValue(new Error("private account content"));
		browser.close.mockRejectedValue(new Error("private browser content"));

		// Act
		const result = gateway.save(desiredEvent, undefined, vi.fn(), vi.fn());

		// Assert
		await expect(result).rejects.toThrow(
			"Event publication failed: unavailable",
		);
		expect(browser.close).toHaveBeenCalledOnce();
	});
	it("publishes through an authenticated ephemeral session with the approval guard", async () => {
		// Arrange
		const { gateway, browser, login } = fixture();
		const guard = vi.fn();
		const publish = vi
			.spyOn(MeetupEventPublisher.prototype, "publish")
			.mockResolvedValue({ url: eventUrl, status: "published" });

		// Act
		const result = await gateway.publish(desiredEvent, eventUrl, guard);

		// Assert
		expect(result.status).toBe("published");
		expect(login).toHaveBeenCalledOnce();
		expect(publish).toHaveBeenCalledWith(desiredEvent, eventUrl, guard);
		expect(browser.close).toHaveBeenCalledOnce();
	});
});
