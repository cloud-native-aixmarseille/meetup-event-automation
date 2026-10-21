import { MeetupEventUrl, MeetupGroupUrl } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { MeetupBrowserRoutes } from "./meetup-browser-routes.js";

const origin = "https://events.example.test:8443";
const group = MeetupGroupUrl.parse(
	"https://events.example.test:8443/example-group/",
);
if (!group) throw new Error("Invalid fixture");

describe("Meetup browser routes", () => {
	it("constructs organizer routes from validated identities", () => {
		// Arrange
		const event = MeetupEventUrl.parse(
			"https://events.example.test:8443/example-group/events/12345/",
		);
		if (!event) throw new Error("Invalid fixture");

		// Act
		const schedule = new MeetupBrowserRoutes().schedule(group);
		const edit = new MeetupBrowserRoutes().edit(event);

		// Assert
		expect(schedule).toBe(
			"https://events.example.test:8443/example-group/schedule/",
		);
		expect(edit).toBe(
			"https://events.example.test:8443/example-group/events/12345/edit/",
		);
		expect(new MeetupBrowserRoutes().login(origin)).toBe(
			"https://events.example.test:8443/login/",
		);
		expect(new MeetupBrowserRoutes().account(origin)).toBe(
			"https://events.example.test:8443/account/management/",
		);
	});

	it("extracts only event identity from a browser redirect", () => {
		// Arrange
		const location = new URL(
			"https://events.example.test:8443/example-group/events/12345?source=preview#details",
		);

		// Act
		const event = new MeetupBrowserRoutes().eventLocation(location, group);

		// Assert
		expect(event?.value).toBe(
			"https://events.example.test:8443/example-group/events/12345/",
		);
	});

	it.each([
		"https://events.example.test:8443/other-group/events/12345/",
		"https://untrusted.example/example-group/events/12345/",
		"https://user:password@www.meetup.com/example-group/events/12345/",
		"https://events.example.test:8443/example-group/events/12345/edit/",
		"http://www.meetup.com/example-group/events/12345/",
	])("rejects an unexpected event redirect: %s", (value) => {
		// Arrange
		const location = new URL(value);

		// Act
		const event = new MeetupBrowserRoutes().eventLocation(location, group);

		// Assert
		expect(event).toBeUndefined();
	});

	it.each([
		["https://events.example.test:8443/login/?returnUri=%2Faccount", true],
		["https://events.example.test:8443/login", true],
		["https://events.example.test:8443/login-other", false],
		["https://untrusted.example/login/", false],
		["https://events.example.test/login/", false],
		["https://events.example.test.evil.test:8443/login/", false],
		["https://user:password@www.meetup.com/login/", false],
	])("checks the login origin and path: %s", (value, expected) => {
		// Arrange
		const location = new URL(value);

		// Act
		const result = new MeetupBrowserRoutes().isPath(location, "/login", origin);

		// Assert
		expect(result).toBe(expected);
	});

	it.each([
		["", true],
		["/", true],
		["/?token=private", false],
		["/#details", false],
		["/other", false],
	])(
		"requires the exact editor route, allowing one final slash: %s",
		(suffix, expected) => {
			// Arrange
			const editor =
				"https://events.example.test:8443/example-group/events/12345/edit";

			// Act
			const result = new MeetupBrowserRoutes().matchesEditor(
				`${editor}${suffix}`,
				`${editor}/`,
			);

			// Assert
			expect(result).toBe(expected);
		},
	);
});
