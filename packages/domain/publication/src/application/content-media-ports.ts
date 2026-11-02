import type { ContentMedia } from "../domain/content-media.js";
import type { AssetContainer } from "./ports.js";

export interface EventCoverRepository {
	place(input: {
		media: ContentMedia;
		container: AssetContainer;
		name: string;
	}): Promise<void>;
}
export interface ContentImageBytes {
	readonly bytes: Uint8Array;
	readonly mimeType: "image/png" | "image/jpeg";
}
export interface ContentImageLoader {
	load(url: string): Promise<ContentImageBytes>;
}
export interface ContentMediaStore {
	reserve(): Promise<string>;
	persist(
		id: string,
		image: ContentImageBytes,
		description: string,
	): Promise<ContentMedia>;
	read(id: string): Promise<ContentMedia | undefined>;
	verify(media: ContentMedia): Promise<boolean>;
}
