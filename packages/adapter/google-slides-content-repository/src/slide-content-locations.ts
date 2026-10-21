import type { slides_v1 } from "@googleapis/slides";
import {
	type AssetImageRepository,
	type ContentBinding,
	ContentError,
	ContentFingerprint,
	type ObservedLocation,
} from "@meetup-automation/publication";
import { SlideContentElement } from "./slide-content-element.js";
import { SlideTemplateBindings } from "./slide-template-bindings.js";

export class SlideContentLocations {
	constructor(private readonly images: AssetImageRepository) {}

	async read(
		data: slides_v1.Schema$Presentation,
		bindings: readonly ContentBinding[],
	): Promise<ObservedLocation[]> {
		const locations: ObservedLocation[] = [];
		for (const binding of bindings) {
			const element = SlideContentElement.find(data, binding);
			let fingerprint: string;
			if (binding.type === "text") {
				if (!element.shape) throw new ContentError("conflict");
				fingerprint = ContentFingerprint.of(
					SlideTemplateBindings.text(element),
				);
			} else {
				if (!element.image?.contentUrl) throw new ContentError("conflict");
				const bytes = await this.images.observe(element.image.contentUrl);
				fingerprint = ContentFingerprint.of(
					// This persisted byte contract preserves provider property order;
					// changing it requires recovery for existing image bindings.
					JSON.stringify([
						bytes,
						element.image.imageProperties,
						element.description,
					]),
				);
			}
			locations.push({
				id: binding.id,
				key: binding.key,
				type: binding.type,
				anchor: binding.anchor,
				fingerprint,
			});
		}
		return locations;
	}
}
