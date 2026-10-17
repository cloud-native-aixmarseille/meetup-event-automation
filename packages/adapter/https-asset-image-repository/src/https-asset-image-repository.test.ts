import { describe, expect, it, vi } from "vitest";
import { ContentFingerprint } from "@meetup-automation/publication";
import { BoundedImageDownload } from "./bounded-image-download.js";
import { HttpsAssetImageRepository } from "./https-asset-image-repository.js";

const png = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
	"base64",
);
const source = {
	url: "https://images.example.org/portrait.png",
	description: "Speaker portrait",
};

describe("image preflight", () => {
	it("fingerprints downloaded bytes and returns the validated final URL", async () => {
		// Arrange
		const download = new BoundedImageDownload();
		vi.spyOn(download, "get").mockResolvedValue({
			bytes: png,
			mediaType: "image/png",
			url: source.url,
		});
		const repository = new HttpsAssetImageRepository(download);
		// Act
		const result = await repository.validate(source);
		// Assert
		expect(result).toEqual({ fingerprint: ContentFingerprint.of(png), source });
	});

	it.each(["image/jpeg", "image/svg+xml", "text/html"])(
		"rejects a mismatched media type %s",
		async (mediaType) => {
			// Arrange
			const download = new BoundedImageDownload();
			vi.spyOn(download, "get").mockResolvedValue({
				bytes: png,
				mediaType,
				url: source.url,
			});
			const repository = new HttpsAssetImageRepository(download);
			// Act
			const result = repository.validate(source);
			// Assert
			await expect(result).rejects.toMatchObject({ code: "image" });
		},
	);

	it("rejects excessive image dimensions", async () => {
		// Arrange
		const bytes = Buffer.from(png);
		bytes.writeUInt32BE(100_000, 16);
		bytes.writeUInt32BE(100_000, 20);
		const download = new BoundedImageDownload();
		vi.spyOn(download, "get").mockResolvedValue({
			bytes,
			mediaType: "image/png",
			url: source.url,
		});
		const repository = new HttpsAssetImageRepository(download);
		// Act
		const result = repository.validate(source);
		// Assert
		await expect(result).rejects.toMatchObject({ code: "image" });
	});
});
