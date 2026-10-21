import { describe, expect, it } from "vitest";
import { MeetupEventUrl } from "./meetup-event-url.js";
import { MeetupGroupUrl } from "./meetup-group-url.js";

describe("Meetup event identity", () => {
	it.each(["", "/"])(
		"canonicalizes a public event link ending in %j",
		(suffix) => {
			// Arrange
			const input = `https://www.meetup.com/example-group/events/12345${suffix}`;

			// Act
			const event = MeetupEventUrl.parse(input);

			// Assert
			expect(event?.value).toBe(
				"https://www.meetup.com/example-group/events/12345/",
			);
			expect(event?.group.value).toBe("https://www.meetup.com/example-group/");
		},
	);

	it.each([
		undefined,
		{},
		"not a URL",
		"https://www.meetup.com/example-group/events/0/",
		"https://www.meetup.com/example-group/events/0123/",
		"https://www.meetup.com/example-group/events/-1/",
		"https://www.meetup.com/example-group/events/123/edit/",
		"https://www.meetup.com/example-group/events/123//",
		"https://www.meetup.com/example-group/events/123/\n",
		" https://www.meetup.com/example-group/events/123/",
		"https://www.meetup.com/example-group/events/123/?token=private",
		"https://www.meetup.com/example-group/events/123/#fragment",
		"https://www.meetup.com/example-group/events/%31/",
		"https://www.meetup.com/example-group/events/other/../123/",
		"https://www.meetup.com\\example-group/events/123/",
		"https://www.meetup.com@evil.test/example-group/events/123/",
		"https://user:password@www.meetup.com/example-group/events/123/",
		"https://www.meetup.com:443/example-group/events/123/",
		"http://www.meetup.com/example-group/events/123/",
	])("rejects nonidentity URLs: %j", (input) => {
		// Arrange
		// The table supplies the untrusted input.

		// Act
		const result = MeetupEventUrl.parse(input);

		// Assert
		expect(result).toBeUndefined();
	});

	it.each([
		["https://events.example.test:8443/example-group/events/12345/", true],
		["https://events.example.test:8443/other-group/events/12345/", false],
		["https://events.example.test/example-group/events/12345/", false],
		[
			"https://events.example.test.evil.test:8443/example-group/events/12345/",
			false,
		],
		["https://www.meetup.com/example-group/events/12345/", false],
	])("checks the configured origin and group: %s", (input, accepted) => {
		// Arrange
		const group = MeetupGroupUrl.parse(
			"https://events.example.test:8443/example-group/",
		);
		if (!group) throw new Error("Invalid fixture");

		// Act
		const result = MeetupEventUrl.parse(input, group);

		// Assert
		expect(result !== undefined).toBe(accepted);
	});
});
