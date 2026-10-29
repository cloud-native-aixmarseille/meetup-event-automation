import type { SlideCollectionBounds } from "./slide-collection-layout.js";
import type { slides_v1 } from "@googleapis/slides";

export interface SlideCollectionTemplate {
	readonly mode: "slide" | "grid";
	readonly rootId: string;
	readonly pageId: string;
	readonly members: readonly {
		objectId: string;
		key: string;
		type: "text" | "image";
	}[];
	readonly transform?: slides_v1.Schema$AffineTransform;
	readonly bounds?: SlideCollectionBounds;
}
