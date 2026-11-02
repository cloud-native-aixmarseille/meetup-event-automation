import { describe, expect, it } from "vitest";
import { EventWebsiteConfiguration } from "./event-website-configuration.js";

describe("website configuration", () => {
	it("allows a repository and Markdown file within the consumer organization", () => {
		// Arrange
		const input = { repository: ".github", path: "website/events.md" };
		// Act
		const result = new EventWebsiteConfiguration().parse(input);
		// Assert
		expect(result).toEqual(input);
	});
	it.each([
		null,
		{},
		[],
		{ repository: "another/repository", path: "events.md" },
		{ repository: "site", path: "../events.md" },
		{ repository: "site", path: "/events.md" },
		{ repository: "site", path: "workflow.yml" },
		{ repository: "site", path: "events.md", branch: "elsewhere" },
	])("rejects ambiguous or unsafe targets", (input) => {
		// Arrange
		const subject = new EventWebsiteConfiguration();
		// Act
		const parse = () => subject.parse(input);
		// Assert
		expect(parse).toThrow("Invalid website");
	});
});
