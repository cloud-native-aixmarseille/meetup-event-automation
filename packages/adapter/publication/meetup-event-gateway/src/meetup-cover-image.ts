import { createHash } from "node:crypto";
import type {
	ContentImageBytes,
	ContentMedia,
} from "@meetup-automation/publication";
import { imageSize } from "image-size";

/** Validate the exact reviewed bytes before any provider upload. */
export class MeetupCoverImage {
	valid(image: ContentImageBytes, cover: ContentMedia): boolean {
		if (
			!image.bytes.length ||
			image.bytes.length >= 15_000_000 ||
			image.mimeType !== cover.mimeType ||
			createHash("sha256").update(image.bytes).digest("hex") !==
				cover.fingerprint
		)
			return false;
		try {
			const size = imageSize(image.bytes);
			return (
				(size.type === "png"
					? "image/png"
					: size.type === "jpg"
						? "image/jpeg"
						: undefined) === image.mimeType &&
				Boolean(
					size.width &&
						size.height &&
						size.width * size.height <= 24_000_000 &&
						size.width === cover.width &&
						size.height === cover.height,
				)
			);
		} catch {
			return false;
		}
	}
}
