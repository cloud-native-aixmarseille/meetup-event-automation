import { ContentError } from "./content-error.js";

export type ContentImageLocation = Readonly<{
	kind: "cover" | "host-logo" | "speaker-picture" | "fallback" | "embedded";
	slot: string;
}>;

/** Safe image failure facts; never retains source URLs or provider responses. */
export class ContentImageError extends ContentError {
	constructor(
		readonly reason:
			| "source"
			| "format"
			| "size"
			| "dimensions"
			| "download"
			| "changed",
		readonly location?: ContentImageLocation,
	) {
		super("image");
		this.name = "ContentImageError";
	}

	at(location: ContentImageLocation): ContentImageError {
		return new ContentImageError(this.reason, this.location ?? location);
	}
}
