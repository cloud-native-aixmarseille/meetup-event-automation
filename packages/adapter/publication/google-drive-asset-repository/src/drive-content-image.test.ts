import { describe, expect, it } from "vitest";
import { DriveContentImage } from "./drive-content-image.js";
describe("stored image validation", () => {
	it("derives dimensions and fingerprint from the actual bytes", () => {
		// Arrange
		const bytes = Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
			"base64",
		);
		const image = new DriveContentImage();
		// Act
		const result = image.inspect({ bytes, mimeType: "image/png" });
		// Assert
		expect(result).toMatchObject({
			width: 1,
			height: 1,
			mimeType: "image/png",
		});
		expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
	});
	it("rejects MIME claims that disagree with the file signature", () => {
		// Arrange
		const bytes = Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
			"base64",
		);
		const image = new DriveContentImage();
		// Act
		const inspect = () => image.inspect({ bytes, mimeType: "image/jpeg" });
		// Assert
		expect(inspect).toThrow("encoding");
	});
});
