import { describe, expect, it } from "vitest";
import { PublicAssetUrl } from "./public-asset-url.js";

describe("PublicAssetUrl", () => {
	it.each([
		["https://images.example.test/portrait.png", true],
		["https://example.test/feedback?view=public", true],
		["http://example.test/image", false],
		["https://user:pass@example.test/image", false],
		["https://example.test/image?Signature=private", false],
		["https://example.test/image?auth=private", false],
		["invalid", false],
		[undefined, false],
	] as const)(
		"checks public projection eligibility for %s",
		(input, expected) => {
			// Arrange
			const value = input;

			// Act
			const valid = new PublicAssetUrl().valid(value);

			// Assert
			expect(valid).toBe(expected);
		},
	);
});
