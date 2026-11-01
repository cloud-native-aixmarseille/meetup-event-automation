import { LinkedInPostReference } from "@meetup-automation/communication";
import type { EventDiagnostic } from "@meetup-automation/event";
import { describe, expect, it } from "vitest";
import { IssueFormLinkedInPosts } from "./issue-form-linkedin-posts.js";

describe("published LinkedIn post field", () => {
	it("reads a collection, removes tracking and keeps distinct posts", () => {
		// Arrange
		const reader = new IssueFormLinkedInPosts(new LinkedInPostReference());
		const diagnostics: EventDiagnostic[] = [];
		const url = "https://www.linkedin.com/feed/update/urn:li:activity:12345/";
		const second = url.replace("12345", "67890");
		// Act
		const posts = reader.read(
			`${url}?utm_source=share\n- ${url}\n\n${second}`,
			diagnostics,
		);
		// Assert
		expect(posts).toEqual([url, second]);
		expect(diagnostics).toEqual([]);
	});
	it("reports malformed entries without exposing their contents", () => {
		// Arrange
		const reader = new IssueFormLinkedInPosts(new LinkedInPostReference());
		const diagnostics: EventDiagnostic[] = [];
		// Act
		const posts = reader.read(
			"private@example.test\nhttps://www.linkedin.com/company/example/",
			diagnostics,
		);
		// Assert
		expect(posts).toEqual([]);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].code).toBe("event.linkedin-post.invalid");
		expect(JSON.stringify(diagnostics)).not.toContain("private@example.test");
	});
});
