import { createHash } from "node:crypto";
import {
	type ContentImageBytes,
	type ContentImageLoader,
	type ContentMedia,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";

export type OcgroupsPhotoFile = ContentImageBytes &
	Readonly<{ name: string; path: string }>;

/** Verify approved bytes before adapting them to the provider's 1 MiB limit. */
export class OcgroupsPhotoImage {
	private readonly prepared = new Map<string, OcgroupsPhotoFile>();
	constructor(
		private readonly page: Page,
		private readonly images: ContentImageLoader,
	) {}

	async prepare(cover: ContentMedia): Promise<OcgroupsPhotoFile> {
		if (
			!Number.isSafeInteger(cover.width) ||
			!Number.isSafeInteger(cover.height) ||
			cover.width < 1 ||
			cover.height < 1 ||
			cover.width * cover.height > 24_000_000
		)
			throw new ScheduledEventError("content-review");
		const key = `${cover.fingerprint}|${cover.mimeType}|${cover.width}|${cover.height}`;
		const cached = this.prepared.get(key);
		if (cached) return cached;
		const image = await this.images.load(cover.url);
		if (
			!image.bytes.length ||
			image.bytes.length > 15_000_000 ||
			image.mimeType !== cover.mimeType ||
			createHash("sha256").update(image.bytes).digest("hex") !==
				cover.fingerprint
		)
			throw new ScheduledEventError("content-review");
		const encoded = await this.encode(image, cover);
		const bytes = Buffer.from(encoded.base64, "base64");
		if (!bytes.length || bytes.length > 1_048_576)
			throw new ScheduledEventError("content-review");
		const fingerprint = createHash("sha256").update(bytes).digest("hex");
		const name = `${fingerprint}.${encoded.mimeType === "image/png" ? "png" : "jpg"}`;
		const prepared = {
			bytes,
			mimeType: encoded.mimeType,
			name,
			path: `/images/${name}`,
		};
		this.prepared.set(key, prepared);
		return prepared;
	}

	private async encode(image: ContentImageBytes, cover: ContentMedia) {
		try {
			return await this.page.evaluate(
				async ({ base64, mimeType, width, height }) => {
					const bytes = Uint8Array.from(atob(base64), (character) =>
						character.charCodeAt(0),
					);
					const bitmap = await createImageBitmap(
						new Blob([bytes], { type: mimeType }),
					);
					try {
						if (bitmap.width !== width || bitmap.height !== height)
							throw new Error("Image dimensions changed");
						if (bytes.length <= 1_048_576) return { base64, mimeType };
						const canvas = document.createElement("canvas");
						const scale = Math.min(1, 1920 / Math.max(width, height));
						canvas.width = Math.max(1, Math.round(width * scale));
						canvas.height = Math.max(1, Math.round(height * scale));
						const context = canvas.getContext("2d");
						if (!context) throw new Error("Canvas unavailable");
						context.fillStyle = "white";
						context.fillRect(0, 0, canvas.width, canvas.height);
						context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
						for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
							const candidate = canvas
								.toDataURL("image/jpeg", quality)
								.split(",")[1];
							if (atob(candidate).length <= 1_048_576)
								return { base64: candidate, mimeType: "image/jpeg" as const };
						}
						throw new Error("Image too large");
					} finally {
						bitmap.close();
					}
				},
				{
					base64: Buffer.from(image.bytes).toString("base64"),
					mimeType: image.mimeType,
					width: cover.width,
					height: cover.height,
				},
			);
		} catch {
			throw new ScheduledEventError("content-review");
		}
	}
}
