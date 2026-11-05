import type { slides_v1 } from "@googleapis/slides";
import {
	ContentImageError,
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
	private async canonical(
		value: unknown,
		objectId = "unknown",
	): Promise<unknown> {
		if (Array.isArray(value))
			return Promise.all(value.map((item) => this.canonical(item, objectId)));
		if (!value || typeof value !== "object") return value;
		if ("objectId" in value && typeof value.objectId === "string")
			objectId = value.objectId;
		const result: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value).sort(([a], [b]) =>
			a.localeCompare(b),
		)) {
			if (key === "sourceUrl") continue;
			if (key === "contentUrl") {
				if (typeof item !== "string")
					throw new ContentImageError("download", {
						kind: "embedded",
						slot: objectId,
					});
				result.embeddedBytes = await this.observe(item, objectId);
			} else result[key] = await this.canonical(item, objectId);
		}
		return result;
	}
	private async observe(url: string, slot: string): Promise<string> {
		try {
			return await this.images.observe(url);
		} catch (error) {
			if (!(error instanceof ContentImageError)) throw error;
			throw error.at({ kind: "embedded", slot });
		}
	}
}
