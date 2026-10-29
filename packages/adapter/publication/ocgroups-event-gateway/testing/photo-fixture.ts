import { createHash } from "node:crypto";
import type {
	ContentImageBytes,
	ContentMedia,
} from "@meetup-automation/publication";

export const image: ContentImageBytes = {
	mimeType: "image/png",
	bytes: Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWJiYPj/HwAAAP//SnIwEgAAAAZJREFUAwADDAIB6Pxv8AAAAABJRU5ErkJggg==",
		"base64",
	),
};
export const cover: ContentMedia = {
	id: "approved-cover",
	url: "https://images.example.test/cover.png",
	fingerprint: createHash("sha256").update(image.bytes).digest("hex"),
	description: "Approved illustration",
	mimeType: "image/png",
	width: 1,
	height: 1,
	sourceRevision: "reviewed-revision",
};
export const photoPath = `/images/${cover.fingerprint}.png`;
export const images = { load: async () => image };
