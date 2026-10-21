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
		"https://www.meetup.com.evil.test/example-group/events/123/",
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
		["example-group", true],
		["other-group", false],
	])("checks membership in the configured group: %s", (slug, accepted) => {
		// Arrange
		const group = MeetupGroupUrl.parse("https://www.meetup.com/example-group/");
		if (!group) throw new Error("Invalid fixture");
		const input = `https://www.meetup.com/${slug}/events/12345/`;

		// Act
		const result = MeetupEventUrl.parse(input, group);

		// Assert
		expect(result !== undefined).toBe(accepted);
	});
});
