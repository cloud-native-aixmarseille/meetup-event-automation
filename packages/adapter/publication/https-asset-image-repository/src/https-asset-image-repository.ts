import {
	type AssetImageRepository,
	ContentError,
	type ContentFingerprint,
	type ImageSource,
} from "@meetup-automation/publication";
import { imageSize } from "image-size";
import type { BoundedImageDownload } from "./bounded-image-download.js";

export interface HttpsAssetImageRepositoryCollaborators {
	readonly contentFingerprint: Pick<ContentFingerprint, "of">;
}

export class HttpsAssetImageRepository implements AssetImageRepository {
	constructor(
		private readonly collaborators: HttpsAssetImageRepositoryCollaborators,
		private readonly download: Pick<BoundedImageDownload, "get">,
	) {}

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
				fingerprint: this.collaborators.contentFingerprint.of(result.bytes),
				source: { url: result.url, description: source.description },
			};
		} catch {
			throw new ContentError("image");
		}
	}

	async observe(url: string): Promise<string> {
		try {
			const { bytes } = await this.download.get(url, true);
			return this.collaborators.contentFingerprint.of(bytes);
		} catch {
			throw new ContentError("image");
		}
	}
}
