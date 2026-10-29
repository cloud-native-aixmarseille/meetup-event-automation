import type { slides_v1 } from "@googleapis/slides";
import {
	ContentError,
	type AssetImageRepository,
	type CollectionField,
	type ContentBinding,
	type ContentFingerprint,
	type ObservedLocation,
} from "@meetup-automation/publication";
import type { SlideCollectionIdentity } from "./slide-collection-identity.js";

/** Observe the whole owned container, including styling and embedded image bytes. */
export class SlideCollectionLocations {
	constructor(
		private readonly identity: Pick<SlideCollectionIdentity, "roots">,
		private readonly fingerprints: Pick<ContentFingerprint, "of">,
		private readonly images: AssetImageRepository,
	) {}
	async read(
		data: slides_v1.Schema$Presentation,
		field: CollectionField,
		binding: ContentBinding,
	): Promise<ObservedLocation> {
		const roots = this.identity.roots(data, field);
		const observed = [];
		for (const root of roots) observed.push(await this.canonical(root));
		return {
			...binding,
			fingerprint: this.fingerprints.of(JSON.stringify(observed)),
		};
	}
	private async canonical(value: unknown): Promise<unknown> {
		if (Array.isArray(value))
			return Promise.all(value.map((item) => this.canonical(item)));
		if (!value || typeof value !== "object") return value;
		const result: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value).sort(([a], [b]) =>
			a.localeCompare(b),
		)) {
			if (key === "sourceUrl") continue;
			if (key === "contentUrl") {
				if (typeof item !== "string") throw new ContentError("image");
				result.embeddedBytes = await this.images.observe(item);
			} else result[key] = await this.canonical(item);
		}
		return result;
	}
}
