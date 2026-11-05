import type { slides_v1 } from "@googleapis/slides";
import {
	type AssetImageRepository,
	type ContentBinding,
	ContentError,
	ContentImageError,
	type ContentFingerprint,
	type ObservedLocation,
} from "@meetup-automation/publication";
import type { SlideContentElement } from "./slide-content-element.js";
import type { SlideTemplateBindings } from "./slide-template-bindings.js";

export interface SlideContentLocationsCollaborators {
	readonly slideContentElement: Pick<SlideContentElement, "find">;
	readonly contentFingerprint: Pick<ContentFingerprint, "of">;
	readonly slideTemplateBindings: Pick<SlideTemplateBindings, "text">;
}

export class SlideContentLocations {
	constructor(
		private readonly collaborators: SlideContentLocationsCollaborators,
		private readonly images: AssetImageRepository,
	) {}

	async read(
		data: slides_v1.Schema$Presentation,
		bindings: readonly ContentBinding[],
	): Promise<ObservedLocation[]> {
		const locations: ObservedLocation[] = [];
		for (const binding of bindings) {
			const element = this.collaborators.slideContentElement.find(
				data,
				binding,
			);
			let fingerprint: string;
			if (binding.type === "text") {
				if (!element.shape) throw new ContentError("conflict");
				fingerprint = this.collaborators.contentFingerprint.of(
					this.collaborators.slideTemplateBindings.text(element),
				);
			} else {
				if (!element.image?.contentUrl) throw new ContentError("conflict");
				const bytes = await this.observe(
					element.image.contentUrl,
					binding.anchor.objectId ?? binding.key,
				);
				fingerprint = this.collaborators.contentFingerprint.of(
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
	private async observe(url: string, slot: string): Promise<string> {
		try {
			return await this.images.observe(url);
		} catch (error) {
			if (!(error instanceof ContentImageError)) throw error;
			throw error.at({ kind: "embedded", slot });
		}
	}
}
export type SlideContentLocationsArguments =
	ConstructorParameters<typeof SlideContentLocations> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
