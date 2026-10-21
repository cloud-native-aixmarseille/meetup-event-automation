import { describe, expect, it } from "vitest";
import { MeetupGroupUrl } from "./meetup-group-url.js";

describe("Meetup group identity", () => {
	it("derives the configured event prefix from a group", () => {
		// Arrange
		const url = "https://www.meetup.com/example-group/";

		// Act
		const group = MeetupGroupUrl.parse(url);

		// Assert
		expect(group?.value).toBe(url);
		expect(group?.eventUrlPrefix).toBe(
			"https://www.meetup.com/example-group/events/",
		);
	});

	it("resolves a group from the configured event prefix", () => {
		// Arrange
		const prefix = "https://www.meetup.com/example-group/events/";

		// Act
		const group = MeetupGroupUrl.fromEventUrlPrefix(prefix);

		// Assert
		expect(group?.value).toBe("https://www.meetup.com/example-group/");
	});

	it.each([
		undefined,
		{},
		"",
		"https://www.meetup.com/",
		"https://www.meetup.com/Example-Group/",
		"https://www.meetup.com/example-group",
		"https://www.meetup.com/example-group/extra/",
		"https://www.meetup.com/example-group\n/",
		"https://www.meetup.com/example-group/?token=private",
		"https://www.meetup.com/example-group/#fragment",
		"https://www.meetup.com/example-group/../other/",
		"https://www.meetup.com/%65xample-group/",
		"https://www.meetup.com:443/example-group/",
		"https://user@www.meetup.com/example-group/",
		"https://www.meetup.com.evil.test/example-group/",
		"http://www.meetup.com/example-group/",
	])("rejects noncanonical group URLs: %j", (value) => {
		// Arrange
		// The table supplies an external value.

		// Act
		const result = MeetupGroupUrl.parse(value);

		// Assert
		expect(result).toBeUndefined();
	});

	it.each([
		"https://www.meetup.com/example-group/events",
		"https://www.meetup.com/example-group/events/123/",
		"https://www.meetup.com/example-group/schedule/",
		"https://untrusted.example/example-group/events/",
	])("rejects invalid configured event prefixes: %s", (prefix) => {
		// Arrange
		// The table supplies the configuration.

		// Act
		const result = MeetupGroupUrl.fromEventUrlPrefix(prefix);

		// Assert
		expect(result).toBeUndefined();
	});
});
