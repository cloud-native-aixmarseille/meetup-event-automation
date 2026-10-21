import { MeetupEventUrl, MeetupGroupUrl } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { MeetupBrowserRoutes } from "./meetup-browser-routes.js";

const group = MeetupGroupUrl.parse("https://www.meetup.com/example-group/");
if (!group) throw new Error("Invalid fixture");

describe("Meetup browser routes", () => {
	it("constructs organizer routes from validated identities", () => {
		// Arrange
		const event = MeetupEventUrl.parse(
			"https://www.meetup.com/example-group/events/12345/",
		);
		if (!event) throw new Error("Invalid fixture");

		// Act
		const schedule = MeetupBrowserRoutes.schedule(group);
		const edit = MeetupBrowserRoutes.edit(event);

		// Assert
		expect(schedule).toBe("https://www.meetup.com/example-group/schedule/");
		expect(edit).toBe(
			"https://www.meetup.com/example-group/events/12345/edit/",
		);
		expect(MeetupBrowserRoutes.login).toBe("https://www.meetup.com/login/");
		expect(MeetupBrowserRoutes.account).toBe(
			"https://www.meetup.com/account/management/",
		);
	});

	it("extracts only event identity from a browser redirect", () => {
		// Arrange
		const location = new URL(
			"https://www.meetup.com/example-group/events/12345?source=preview#details",
		);

		// Act
		const event = MeetupBrowserRoutes.eventLocation(location, group);

		// Assert
		expect(event?.value).toBe(
			"https://www.meetup.com/example-group/events/12345/",
		);
	});

	it.each([
		"https://www.meetup.com/other-group/events/12345/",
		"https://untrusted.example/example-group/events/12345/",
		"https://user:password@www.meetup.com/example-group/events/12345/",
		"https://www.meetup.com/example-group/events/12345/edit/",
		"http://www.meetup.com/example-group/events/12345/",
	])("rejects an unexpected event redirect: %s", (value) => {
		// Arrange
		const location = new URL(value);

		// Act
		const event = MeetupBrowserRoutes.eventLocation(location, group);

		// Assert
		expect(event).toBeUndefined();
	});

	it.each([
		["https://www.meetup.com/login/?returnUri=%2Faccount", true],
		["https://www.meetup.com/login", true],
		["https://www.meetup.com/login-other", false],
		["https://untrusted.example/login/", false],
		["https://user:password@www.meetup.com/login/", false],
	])("checks the login origin and path: %s", (value, expected) => {
		// Arrange
		const location = new URL(value);

		// Act
		const result = MeetupBrowserRoutes.isPath(location, "/login");

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
			const editor = "https://www.meetup.com/example-group/events/12345/edit";

			// Act
			const result = MeetupBrowserRoutes.matchesEditor(
				`${editor}${suffix}`,
				`${editor}/`,
			);

			// Assert
			expect(result).toBe(expected);
		},
	);
});
