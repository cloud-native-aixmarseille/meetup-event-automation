import { describe, expect, it } from "vitest";
import { cover, coverImage } from "../testing/cover-fixture.js";
import { MeetupCoverImage } from "./meetup-cover-image.js";

describe("Meetup cover bytes", () => {
	it("accepts the reviewed image encoding, dimensions and fingerprint", () => {
		// Arrange
		const validation = new MeetupCoverImage();
		// Act
		const result = validation.valid(coverImage, cover);
		// Assert
		expect(result).toBe(true);
	});
	it.each([
		{ width: 2 },
		{ height: 2 },
		{ fingerprint: "f".repeat(64) },
		{ mimeType: "image/jpeg" as const },
	])("rejects a mismatch against approved media: %j", (change) => {
		// Arrange
		const validation = new MeetupCoverImage();
		// Act
		const result = validation.valid(coverImage, { ...cover, ...change });
		// Assert
		expect(result).toBe(false);
	});
	it.each([0, 15_000_000])(
		"rejects an unsupported byte count: %s",
		(length) => {
			// Arrange
			const validation = new MeetupCoverImage();
			const image = { ...coverImage, bytes: new Uint8Array(length) };
			// Act
			const result = validation.valid(image, cover);
			// Assert
			expect(result).toBe(false);
		},
	);
});
