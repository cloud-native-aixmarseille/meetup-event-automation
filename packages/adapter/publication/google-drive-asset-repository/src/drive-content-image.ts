import { createHash } from "node:crypto";
import type { ContentImageBytes } from "@meetup-automation/publication";
import { imageSize } from "image-size";

export class DriveContentImage {
	inspect(image: ContentImageBytes) {
		if (!image.bytes.byteLength || image.bytes.byteLength > 20_000_000)
			throw new Error("Invalid content image size");
		const size = imageSize(image.bytes);
		const mimeType =
			size.type === "png"
				? "image/png"
				: size.type === "jpg"
					? "image/jpeg"
					: undefined;
		if (
			!mimeType ||
			mimeType !== image.mimeType ||
			!size.width ||
			!size.height ||
			size.width * size.height > 25_000_000
		)
			throw new Error("Invalid content image dimensions or encoding");
		return {
			mimeType,
			width: size.width,
			height: size.height,
			fingerprint: createHash("sha256").update(image.bytes).digest("hex"),
		};
	}
}
