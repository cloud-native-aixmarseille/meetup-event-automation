import {
	type AssetImageRepository,
	type ContentBinding,
	type ObservedLocation,
	ContentError,
	ContentFingerprint,
} from "@meetup-automation/publication";
import type { docs_v1 } from "@googleapis/docs";
import { DocumentTabs, type DocumentTab } from "./document-tabs.js";

export class DocumentContentLocations {
	constructor(private readonly images: AssetImageRepository) {}

	async read(
		tabs: readonly DocumentTab[],
		binding: ContentBinding,
		initial: boolean,
	): Promise<ObservedLocation> {
		const tab = tabs.find((tab) => tab.id === binding.anchor.tabId);
		if (!tab || binding.anchor.segmentId) throw new ContentError("conflict");
		if (binding.type === "image") return this.image(tab, binding);
		const range = DocumentContentLocations.range(tabs, binding, initial);
		const text = DocumentTabs.text(
			tab,
			range.startIndex as number,
			range.endIndex as number,
		);
		return {
			id: binding.id,
			key: binding.key,
			type: "text",
			fingerprint: ContentFingerprint.of(text),
			anchor: {
				...binding.anchor,
				start: range.startIndex as number,
				end: range.endIndex as number,
			},
		};
	}

	private static range(
		tabs: readonly DocumentTab[],
		binding: ContentBinding,
		initial: boolean,
	): docs_v1.Schema$Range {
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
			!range.startIndex ||
			!range.endIndex ||
			range.endIndex <= range.startIndex
		)
			throw new ContentError("conflict");
		return range;
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
		DocumentTabs.rejectSuggestions(object);
		DocumentTabs.rejectSuggestions(references[0]);
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
			fingerprint: ContentFingerprint.of(
				JSON.stringify([bytes, properties, object.title, object.description]),
			),
		};
	}
}
