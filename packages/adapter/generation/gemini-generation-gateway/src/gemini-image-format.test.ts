import { describe, expect, it } from "vitest";
import { GeminiImageFormat } from "./gemini-image-format.js";

describe("Gemini image output mapping", () => {
	it.each([
		{ width: 1792, height: 1024, ratio: "16:9", size: "2K" },
		{ width: 1024, height: 1792, ratio: "9:16", size: "2K" },
		{ width: 1024, height: 1024, ratio: "1:1", size: "1K" },
		{ width: 3072, height: 2048, ratio: "3:2", size: "4K" },
	])(
		"maps $width x $height to supported provider settings",
		({ width, height, ratio, size }) => {
			// Arrange
			const format = new GeminiImageFormat();
			const output = { width, height, mimeType: "image/png" as const };
			// Act
			const encoded = format.encode(output);
			// Assert
			expect(encoded).toEqual({
				type: "image",
				mime_type: "image/png",
				aspect_ratio: ratio,
				image_size: size,
			});
		},
	);
	it("encodes the requested media type", () => {
		// Arrange
		const format = new GeminiImageFormat();
		const output = { width: 800, height: 600, mimeType: "image/jpeg" as const };
		// Act
		const encoded = format.encode(output);
		// Assert
		expect(encoded.mime_type).toBe("image/jpeg");
	});
	it.each([
		{ width: 0, height: 1024 },
		{ width: 1024, height: -1 },
		{ width: 1024.5, height: 1024 },
		{ width: Number.NaN, height: 1024 },
		{ width: 1024, height: Number.POSITIVE_INFINITY },
		{ width: 4097, height: 1024 },
		{ width: 1024, height: 4097 },
	])("rejects unsupported dimensions $width x $height", (dimensions) => {
		// Arrange
		const format = new GeminiImageFormat();
		const output = { ...dimensions, mimeType: "image/png" as const };
		// Act
		const encode = () => format.encode(output);
		// Assert
		expect(encode).toThrow("Unsupported image output requirements");
	});
});
