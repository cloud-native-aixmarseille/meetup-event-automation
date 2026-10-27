import { describe, expect, it } from "vitest";
import { LinkedInCommentary } from "./linkedin-commentary.js";

describe("LinkedIn commentary", () => {
	it("escapes reserved syntax so reviewed copy renders as plain text", () => {
		// Arrange
		const codec = new LinkedInCommentary();

		// Act
		const encoded = codec.encode(
			"Meetup (cloud_native) *talk* ~preview~ | {details} @team [notes] <link> \\",
		);

		// Assert
		expect(encoded).toBe(
			"Meetup \\(cloud\\_native\\) \\*talk\\* \\~preview\\~ \\| \\{details\\} \\@team \\[notes\\] \\<link\\> \\\\",
		);
	});
	it("keeps reviewed hashtags while escaping URL fragments", () => {
		// Arrange
		const codec = new LinkedInCommentary();

		// Act
		const encoded = codec.encode(
			"https://example.test/#details\n#CloudNative #cloud_native #équipe",
		);

		// Assert
		expect(encoded).toBe(
			"https://example.test/\\#details\n{hashtag|\\#|CloudNative} {hashtag|\\#|cloud\\_native} {hashtag|\\#|équipe}",
		);
	});
});
