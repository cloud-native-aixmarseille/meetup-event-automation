import { imageSize } from "image-size";
import {
	type AssetImageRepository,
	ContentError,
	ContentFingerprint,
	type ImageSource,
} from "@meetup-automation/publication";
import { BoundedImageDownload } from "./bounded-image-download.js";

export class HttpsAssetImageRepository implements AssetImageRepository {
	constructor(private readonly download = new BoundedImageDownload()) {}

	async validate(
		source: ImageSource,
	): Promise<{ fingerprint: string; source: ImageSource }> {
		try {
			if (!source.description?.trim()) throw new ContentError("image");
			const result = await this.download.get(source.url);
			const size = imageSize(result.bytes);
			const mimeTypes: Record<string, string> = {
				png: "image/png",
				jpg: "image/jpeg",
				gif: "image/gif",
			};
			if (
				!size.type ||
				mimeTypes[size.type] !== result.mediaType ||
				!size.width ||
				!size.height ||
				size.width * size.height > 25_000_000
			)
				throw new ContentError("image");
			return {
				fingerprint: ContentFingerprint.of(result.bytes),
				source: { url: result.url, description: source.description },
			};
		} catch {
			throw new ContentError("image");
		}
	}

	async observe(url: string): Promise<string> {
		try {
			const { bytes } = await this.download.get(url, true);
			return ContentFingerprint.of(bytes);
		} catch {
			throw new ContentError("image");
		}
	}
}
