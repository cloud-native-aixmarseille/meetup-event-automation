import { describe, expect, it } from "vitest";
import { websiteEvent } from "../testing/website.fixtures.js";
import { GithubEventWebsiteComposition } from "./dependency-composition.js";
import { WebsiteEventRow } from "./website-event-row.js";

describe("public event row", () => {
	it.each([
		["fr", "Juin"],
		["en", "June"],
	])("uses %s month names", (locale, month) => {
		// Arrange
		const row = new WebsiteEventRow(
			new GithubEventWebsiteComposition().messages(locale),
		);
		// Act
		const output = row.render(websiteEvent);
		// Assert
		expect(output).toContain(`| ${month} | [2028-06-15]`);
	});
	it("escapes venue markup without exposing extra event fields", () => {
		// Arrange
		const row = new WebsiteEventRow(
			new GithubEventWebsiteComposition().messages("en"),
		);
		const event = {
			...websiteEvent,
			venue: { name: "A | B <script> & *C*", city: "[Town]" },
			email: "private@example.test",
		};
		// Act
		const output = row.render(event);
		// Assert
		expect(output).toBe(
			"| June | [2028-06-15](https://www.meetup.com/example/events/123/) | A &#124; B &lt;script&gt; &amp; \\*C\\* (\\[Town\\]) |",
		);
		expect(output).not.toContain("private");
	});
	it.each([
		{ ...websiteEvent, date: "2028-02-30" },
		{ ...websiteEvent, url: "javascript:alert(1)" },
		{ ...websiteEvent, url: "https://example.test/)\ntext" },
		{ ...websiteEvent, venue: { name: "Unsafe\nrow", city: "Town" } },
	])("rejects invalid public fields", (event) => {
		// Arrange
		const row = new WebsiteEventRow(
			new GithubEventWebsiteComposition().messages("en"),
		);
		// Act
		const render = () => row.render(event);
		// Assert
		expect(render).toThrow("format");
	});
});
