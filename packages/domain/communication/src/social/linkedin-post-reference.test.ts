import { describe, expect, it } from "vitest";
import { LinkedInPostReference } from "./linkedin-post-reference.js";

describe("LinkedIn post references", () => {
	it.each([
		"https://www.linkedin.com/posts/example_topic-activity-12345-community/?utm_source=share",
		"https://linkedin.com/feed/update/urn%3Ali%3Aactivity%3A12345/?utm_medium=copy#comment",
	])("identifies the same published post from %s", (url) => {
		// Arrange
		const references = new LinkedInPostReference();
		// Act
		const post = references.read(url);
		// Assert
		expect(post).toEqual({
			id: "urn:li:activity:12345",
			url: "https://www.linkedin.com/feed/update/urn:li:activity:12345/",
		});
	});
	it.each([
		"https://www.linkedin.com/company/example/",
		"https://www.linkedin.com/in/example/",
		"https://www.linkedin.com.evil.test/feed/update/urn:li:activity:12345/",
		"https://user@www.linkedin.com/feed/update/urn:li:activity:12345/",
		"http://www.linkedin.com/feed/update/urn:li:activity:12345/",
		"https://www.linkedin.com/feed/update/urn:li:activity:12345/|<!channel>",
		"https://www.linkedin.com/feed/update/%xx",
		"not a link",
	])("rejects an unsupported or unsafe reference %s", (url) => {
		// Arrange
		const references = new LinkedInPostReference();
		// Act
		const post = references.read(url);
		// Assert
		expect(post).toBeUndefined();
	});
});
