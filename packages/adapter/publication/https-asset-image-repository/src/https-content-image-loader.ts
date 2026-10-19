import type {
	ContentImageBytes,
	ContentImageLoader,
} from "@meetup-automation/publication";
import type { BoundedImageDownload } from "./bounded-image-download.js";

export class HttpsContentImageLoader implements ContentImageLoader {
	constructor(private readonly download: Pick<BoundedImageDownload, "get">) {}
	async load(url: string): Promise<ContentImageBytes> {
		const result = await this.download.get(url, true);
		if (result.mediaType !== "image/png" && result.mediaType !== "image/jpeg")
			throw new Error("Unsupported submitted image type");
		return { bytes: result.bytes, mimeType: result.mediaType };
	}
}
