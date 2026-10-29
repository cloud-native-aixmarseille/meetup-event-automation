import type { SlideCollectionLayout } from "./slide-collection-layout.js";
import type { slides_v1 } from "@googleapis/slides";
import {
	ContentError,
	type ContentChange,
	type ContentValue,
} from "@meetup-automation/publication";
import type { SlideCollectionIdentity } from "./slide-collection-identity.js";
import type { SlideCollectionDefinition } from "./slide-collection-definition.js";
import type { SlideCollectionTemplate } from "./slide-collection-model.js";
import type { SlideContentRequests } from "./slide-content-requests.js";

/** Duplicate native prototypes and replace their frozen fields in one atomic batch. */
export class SlideCollectionRequests {
	constructor(
		private readonly layouts: Pick<SlideCollectionLayout, "place">,
		private readonly identity: Pick<
			SlideCollectionIdentity,
			"decode" | "roots" | "id"
		>,
		private readonly definition: Pick<SlideCollectionDefinition, "flatten">,
		private readonly contents: Pick<SlideContentRequests, "build">,
	) {}
	build(
		data: slides_v1.Schema$Presentation,
		change: ContentChange,
	): slides_v1.Schema$Request[] {
		const collection = change.value.collection;
		if (!collection?.items.length) throw new ContentError("missing");
		const template = this.identity.decode(collection.template);
		const slot = change.value.key;
		const roots = this.identity.roots(data, {
			slot,
			template: collection.template,
		});
		const root = roots.find((item) => item.objectId === template.rootId);
		if (!root) throw new ContentError("conflict");
		const elements =
			"pageElements" in root
				? (root.pageElements ?? [])
				: "elementGroup" in root
					? (root.elementGroup?.children ?? [])
					: [];
		const flat = this.definition.flatten(elements);
		const requests: slides_v1.Schema$Request[] = roots
			.filter((item) => item !== root)
			.map((item) => ({ deleteObject: { objectId: item.objectId } }));
		for (let index = collection.items.length - 1; index >= 0; index--) {
			const ids = Object.fromEntries(
				[template.rootId, ...flat.map((item) => item.objectId)].map((id) => {
					if (!id) throw new ContentError("location");
					return [id, this.identity.id(slot, index, id)];
				}),
			);
			if (index > 0)
				requests.push({
					duplicateObject: { objectId: template.rootId, objectIds: ids },
				});
			requests.push(
				...this.values(data, template, collection.items[index], ids),
			);
			if (template.mode === "grid")
				requests.push(
					this.layout(
						template,
						ids[template.rootId],
						index,
						collection.items.length,
					),
				);
		}
		return requests;
	}
	private values(
		data: slides_v1.Schema$Presentation,
		template: SlideCollectionTemplate,
		values: readonly ContentValue[],
		ids: Record<string, string>,
	): slides_v1.Schema$Request[] {
		const page = data.slides?.find((item) => item.objectId === template.pageId);
		if (!page) throw new ContentError("conflict");
		const flat = {
			...data,
			slides: [
				{
					...page,
					pageElements: this.definition.flatten(page.pageElements ?? []),
				},
			],
		};
		return template.members.flatMap((member) => {
			const value = values.find(
				(item) => item.key === member.key && item.type === member.type,
			);
			if (!value) throw new ContentError("contract");
			const requests = this.contents.build(flat, {
				location: {
					id: member.objectId,
					type: member.type,
					key: member.key,
					anchor: { objectId: member.objectId, pageId: template.pageId },
					fingerprint: "",
				},
				value,
			});
			return requests.map((request) =>
				this.remap(request, ids[member.objectId]),
			);
		});
	}
	private remap(
		request: slides_v1.Schema$Request,
		objectId: string,
	): slides_v1.Schema$Request {
		if (request.replaceImage)
			return {
				replaceImage: { ...request.replaceImage, imageObjectId: objectId },
			};
		if (request.updatePageElementAltText)
			return {
				updatePageElementAltText: {
					...request.updatePageElementAltText,
					objectId,
				},
			};
		if (request.deleteText)
			return { deleteText: { ...request.deleteText, objectId } };
		if (request.insertText)
			return { insertText: { ...request.insertText, objectId } };
		if (request.updateTextStyle)
			return { updateTextStyle: { ...request.updateTextStyle, objectId } };
		throw new ContentError("contract");
	}
	private layout(
		template: SlideCollectionTemplate,
		objectId: string,
		index: number,
		count: number,
	): slides_v1.Schema$Request {
		return {
			updatePageElementTransform: {
				objectId,
				applyMode: "ABSOLUTE",
				transform: this.layouts.place(
					template.transform,
					template.bounds,
					index,
					count,
				),
			},
		};
	}
}
