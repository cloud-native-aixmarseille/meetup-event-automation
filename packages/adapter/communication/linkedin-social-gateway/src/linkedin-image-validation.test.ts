import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { imageInput } from "../testing/linkedin.fixtures.js";
import { LinkedInImageValidation } from "./linkedin-image-validation.js";

describe("LinkedIn image validation", () => {
	it("accepts approved PNG bytes and their matching fingerprint", () => {
		// Arrange
		const validation = new LinkedInImageValidation();
		const input = imageInput();

		// Act
		const valid = validation.valid(input);

		// Assert
		expect(valid).toBe(true);
	});
	it.each([
		{ fingerprint: "f".repeat(64) },
		{ mimeType: "image/jpeg" },
		{ description: "" },
		{ description: "x".repeat(4087) },
		{ bytes: new Uint8Array(0) },
	])("rejects an invalid or changed reviewed image field", (changes) => {
		// Arrange
		const validation = new LinkedInImageValidation();
		const input = { ...imageInput(), ...changes };

		// Act
		const valid = validation.valid(input);

		// Assert
		expect(valid).toBe(false);
	});
	it("rejects bytes that match their fingerprint but are not an image", () => {
		// Arrange
		const validation = new LinkedInImageValidation();
		const bytes = new TextEncoder().encode("This is not an image");
		const input = {
			...imageInput(),
			bytes,
			fingerprint: createHash("sha256").update(bytes).digest("hex"),
		};

		// Act
		const valid = validation.valid(input);

		// Assert
		expect(valid).toBe(false);
	});
});
