import type { docs_v1 } from "@googleapis/docs";
import {
	type AssetImageRepository,
	type ContentBinding,
	ContentError,
	type ContentFingerprint,
	type ObservedLocation,
} from "@meetup-automation/publication";
import type { DocumentTab, DocumentTabs } from "./document-tabs.js";

export interface DocumentContentLocationsCollaborators {
	readonly documentTabs: Pick<DocumentTabs, "text" | "rejectSuggestions">;
	readonly contentFingerprint: Pick<ContentFingerprint, "of">;
}

export class DocumentContentLocations {
	constructor(
		private readonly collaborators: DocumentContentLocationsCollaborators,
		private readonly images: AssetImageRepository,
	) {}

	async read(
		tabs: readonly DocumentTab[],
		binding: ContentBinding,
		initial: boolean,
	): Promise<ObservedLocation> {
		const tab = tabs.find((tab) => tab.id === binding.anchor.tabId);
		if (!tab || binding.anchor.segmentId) throw new ContentError("conflict");
		if (binding.type === "image") return this.image(tab, binding);
		const range = this.range(tabs, binding, initial);
		const text = this.collaborators.documentTabs.text(
			tab,
			range.startIndex,
			range.endIndex,
		);
		return {
			id: binding.id,
			key: binding.key,
			type: "text",
			fingerprint: this.collaborators.contentFingerprint.of(text),
			anchor: {
				...binding.anchor,
				start: range.startIndex,
				end: range.endIndex,
			},
		};
	}

	private range(
		tabs: readonly DocumentTab[],
		binding: ContentBinding,
		initial: boolean,
	): docs_v1.Schema$Range & { startIndex: number; endIndex: number } {
		const matches = tabs.flatMap((tab) =>
			(
				tab.content.namedRanges?.[binding.anchor.rangeName ?? ""]
					?.namedRanges ?? []
			).map((range) => ({ tab, range })),
		);
		if (
			!matches.length &&
			initial &&
			binding.anchor.start &&
			binding.anchor.end
		)
			return {
				tabId: binding.anchor.tabId,
				startIndex: binding.anchor.start,
				endIndex: binding.anchor.end,
			};
		if (
			matches.length !== 1 ||
			matches[0].tab.id !== binding.anchor.tabId ||
			matches[0].range.ranges?.length !== 1
		)
			throw new ContentError("conflict");
		const range = matches[0].range.ranges[0];
		if (
			range.segmentId ||
			(range.tabId && range.tabId !== binding.anchor.tabId) ||
			typeof range.startIndex !== "number" ||
			typeof range.endIndex !== "number" ||
			!Number.isSafeInteger(range.startIndex) ||
			!Number.isSafeInteger(range.endIndex) ||
			range.startIndex <= 0 ||
			range.endIndex <= range.startIndex
		)
			throw new ContentError("conflict");
		return { ...range, startIndex: range.startIndex, endIndex: range.endIndex };
	}

	private async image(
		tab: DocumentTab,
		binding: ContentBinding,
	): Promise<ObservedLocation> {
		const object =
			tab.content.inlineObjects?.[binding.anchor.objectId ?? ""]
				?.inlineObjectProperties?.embeddedObject;
		const references = (tab.content.body?.content ?? [])
			.flatMap((item) => item.paragraph?.elements ?? [])
			.filter(
				(element) =>
					element.inlineObjectElement?.inlineObjectId ===
					binding.anchor.objectId,
			);
		if (
			!object?.imageProperties?.contentUri ||
			references.length !== 1 ||
			!object.description?.trim()
		)
			throw new ContentError("conflict");
		this.collaborators.documentTabs.rejectSuggestions(object);
		this.collaborators.documentTabs.rejectSuggestions(references[0]);
		const bytes = await this.images.observe(object.imageProperties.contentUri);
		const {
			contentUri: _content,
			sourceUri: _source,
			...properties
		} = object.imageProperties;
		return {
			id: binding.id,
			type: "image",
			key: binding.key,
			anchor: binding.anchor,
			fingerprint: this.collaborators.contentFingerprint.of(
				// Persisted observation bytes preserve provider property order.
				// Do not canonicalize this representation without also handling
				// existing binding fingerprints and uncertain image recovery.
				JSON.stringify([bytes, properties, object.title, object.description]),
			),
		};
	}
}
export type DocumentContentLocationsArguments =
	ConstructorParameters<typeof DocumentContentLocations> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
