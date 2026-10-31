import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { BoundedImageDownload } from "./bounded-image-download.js";
import { HttpsAssetImageRepositoryComposition } from "./dependency-composition.js";
import { HttpsAssetImageRepository } from "./https-asset-image-repository.js";
import { WixImageUrl } from "./wix-image-url.js";

const png = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
	"base64",
);
const webp = Buffer.from(
	"UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
	"base64",
);
const source = {
	url: "https://images.example.org/portrait.png",
	description: "Speaker portrait",
};

describe("image preflight", () => {
	it("uses the validated PNG representation of a Wix WebP portrait", async () => {
		// Arrange
		const url =
			"https://static.wixstatic.com/media/photo.jpg/v1/fit/w_500,h_400/portrait.webp";
		const pngUrl = url.replace(/\.webp$/, ".png");
		const get = vi
			.fn()
			.mockResolvedValueOnce({ bytes: webp, mediaType: "image/webp", url })
			.mockResolvedValueOnce({
				bytes: png,
				mediaType: "image/png",
				url: pngUrl,
			});
		const fingerprint = new PublicationDomainComposition().contentFingerprint();
		const repository = new HttpsAssetImageRepository(
			{ contentFingerprint: fingerprint, wixImageUrl: new WixImageUrl() },
			{ get },
		);

		// Act
		const result = await repository.validate({ ...source, url });

		// Assert
		expect(result).toEqual({
			fingerprint: fingerprint.of(png),
			source: { ...source, url: pngUrl },
		});
		expect(get.mock.calls).toEqual([[url], [pngUrl]]);
	});

	it.each([
		{ bytes: webp, mediaType: "image/webp" },
		{ bytes: png, mediaType: "text/html" },
	])("rejects unusable Wix PNG responses: $mediaType", async (response) => {
		// Arrange
		const url =
			"https://static.wixstatic.com/media/photo.jpg/v1/fit/w_500/portrait.webp";
		const get = vi
			.fn()
			.mockResolvedValueOnce({ bytes: webp, mediaType: "image/webp", url })
			.mockResolvedValueOnce({
				...response,
				url: url.replace(/\.webp$/, ".png"),
			});
		const repository = new HttpsAssetImageRepository(
			{
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
				wixImageUrl: new WixImageUrl(),
			},
			{ get },
		);

		// Act
		const result = repository.validate({ ...source, url });

		// Assert
		await expect(result).rejects.toMatchObject({ code: "image" });
		expect(get).toHaveBeenCalledTimes(2);
	});

	it("does not invent conversion URLs for other WebP providers", async () => {
		// Arrange
		const url = "https://images.example.org/portrait.webp";
		const get = vi
			.fn()
			.mockResolvedValue({ bytes: webp, mediaType: "image/webp", url });
		const repository = new HttpsAssetImageRepository(
			{
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
				wixImageUrl: new WixImageUrl(),
			},
			{ get },
		);

		// Act
		const result = repository.validate({ ...source, url });

		// Assert
		await expect(result).rejects.toMatchObject({ code: "image" });
		expect(get).toHaveBeenCalledTimes(1);
	});

	it("fingerprints downloaded bytes and returns the validated final URL", async () => {
		// Arrange
		const download = new BoundedImageDownload(
			{
				publicImageUrl:
					new HttpsAssetImageRepositoryComposition().publicImageUrl(),
			},
			lookup,
			request,
		);
		vi.spyOn(download, "get").mockResolvedValue({
			bytes: png,
			mediaType: "image/png",
			url: source.url,
		});
		const repository = new HttpsAssetImageRepository(
			{
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
				wixImageUrl: new WixImageUrl(),
			},
			download,
		);

		// Act
		const result = await repository.validate(source);

		// Assert
		expect(result).toEqual({
			fingerprint: new PublicationDomainComposition()
				.contentFingerprint()
				.of(png),
			source,
		});
	});

	it.each(["image/jpeg", "image/svg+xml", "text/html"])(
		"rejects a mismatched media type %s",
		async (mediaType) => {
			// Arrange
			const download = new BoundedImageDownload(
				{
					publicImageUrl:
						new HttpsAssetImageRepositoryComposition().publicImageUrl(),
				},
				lookup,
				request,
			);
			vi.spyOn(download, "get").mockResolvedValue({
				bytes: png,
				mediaType,
				url: source.url,
			});
			const repository = new HttpsAssetImageRepository(
				{
					contentFingerprint:
						new PublicationDomainComposition().contentFingerprint(),
					wixImageUrl: new WixImageUrl(),
				},
				download,
			);

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
		const download = new BoundedImageDownload(
			{
				publicImageUrl:
					new HttpsAssetImageRepositoryComposition().publicImageUrl(),
			},
			lookup,
			request,
		);
		vi.spyOn(download, "get").mockResolvedValue({
			bytes,
			mediaType: "image/png",
			url: source.url,
		});
		const repository = new HttpsAssetImageRepository(
			{
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
				wixImageUrl: new WixImageUrl(),
			},
			download,
		);

		// Act
		const result = repository.validate(source);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "image" });
	});
});
