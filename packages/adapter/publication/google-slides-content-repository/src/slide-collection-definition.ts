import type { SlideCollectionLayout } from "./slide-collection-layout.js";
import type { slides_v1 } from "@googleapis/slides";
import {
	ContentError,
	type CollectionField,
	type ContentTemplateFields,
	type ContentTextKey,
	type TemplateContentDefaults,
	type TextField,
	type ImageField,
} from "@meetup-automation/publication";
import type {
	TemplateCollectionParser,
	TemplateParser,
} from "@meetup-automation/templating";
import type { SlideTemplateBindings } from "./slide-template-bindings.js";
import type { SlideCollectionTemplate } from "./slide-collection-model.js";

/** Discovers native collection boundaries and freezes their public field mapping. */
export class SlideCollectionDefinition {
	constructor(
		private readonly layout: Pick<SlideCollectionLayout, "capture">,
		private readonly directives: Pick<TemplateCollectionParser, "parse">,
		private readonly expressions: Pick<TemplateParser, "parse">,
		private readonly fields: Pick<ContentTemplateFields, "text" | "image">,
		private readonly keys: Pick<ContentTextKey, "of">,
		private readonly bindings: Pick<
			SlideTemplateBindings,
			"text" | "style" | "rejectTokens"
		>,
	) {}

	read(
		page: slides_v1.Schema$Page,
		defaults: TemplateContentDefaults,
	): CollectionField[] {
		const collections = (page.pageElements ?? []).flatMap((element) => {
			const marker = this.marker(element);
			const token = marker
				? this.directives.parse(marker.title ?? "")
				: undefined;
			return token === undefined
				? []
				: [this.collection(page, element, token, defaults)];
		});
		if (
			collections.length > 1 &&
			collections.some((field) => JSON.parse(field.template).mode === "slide")
		)
			throw new ContentError("location");
		return collections;
	}
	private marker(
		element: slides_v1.Schema$PageElement,
	): slides_v1.Schema$PageElement | undefined {
		const candidates = element.elementGroup
			? this.flatten(element.elementGroup.children ?? [])
			: [element];
		const markers = candidates.filter(
			(child) => this.directives.parse(child.title ?? "") !== undefined,
		);
		if (markers.length > 1) throw new ContentError("location");
		return markers[0];
	}

	private collection(
		page: slides_v1.Schema$Page,
		element: slides_v1.Schema$PageElement,
		token: string,
		defaults: TemplateContentDefaults,
	): CollectionField {
		if (
			(token !== "talks" && token !== "speakers") ||
			!element.objectId ||
			!page.objectId
		)
			throw new ContentError("contract");
		const grid = !!element.elementGroup;
		if (!grid && !element.shape) throw new ContentError("location");
		const elements = grid
			? (element.elementGroup?.children ?? [])
			: (page.pageElements ?? []);
		const { members, fields } = this.members(
			elements,
			this.marker(element) ?? element,
			page.objectId,
			token,
			defaults,
		);
		const template: SlideCollectionTemplate = {
			mode: grid ? "grid" : "slide",
			rootId: grid ? element.objectId : page.objectId,
			pageId: page.objectId,
			members,
			...(grid ? this.layout.capture(element) : {}),
		};
		return {
			type: "collection",
			token,
			slot: element.objectId,
			objectId: element.objectId,
			pageId: page.objectId,
			template: JSON.stringify(template),
			fields,
		};
	}
	private members(
		elements: readonly slides_v1.Schema$PageElement[],
		marker: slides_v1.Schema$PageElement,
		pageId: string,
		token: string,
		defaults: TemplateContentDefaults,
	) {
		const members: SlideCollectionTemplate["members"][number][] = [];
		const fields = new Map<string, TextField | ImageField>();
		for (const child of this.flatten(elements)) {
			this.bindings.rejectTokens(child.table);
			if (!child.image && child !== marker)
				this.bindings.rejectTokens({ title: child.title });
			if (child !== marker && this.directives.parse(child.title ?? ""))
				throw new ContentError("location");
			const field = this.member(child, pageId, token, defaults);
			if (!field) continue;
			const key = field.type === "text" ? this.keys.of(field) : field.slot;
			members.push({ objectId: child.objectId ?? "", key, type: field.type });
			fields.set(key, field);
		}
		return { members, fields: [...fields.values()] };
	}

	private member(
		element: slides_v1.Schema$PageElement,
		pageId: string,
		collection: string,
		defaults: TemplateContentDefaults,
	): TextField | ImageField | undefined {
		const text = element.image
			? (element.title ?? "")
			: this.bindings.text(element);
		const expressions = this.expressions.parse(text);
		if (!expressions.length) return undefined;
		if (
			expressions.length !== 1 ||
			expressions[0].start !== 0 ||
			expressions[0].end !== text.length ||
			!element.objectId
		)
			throw new ContentError("location");
		const expression = expressions[0];
		const token = expression.entity
			? `${expression.entity}.${expression.property}`
			: expression.property;
		const scoped = token.startsWith(
			collection === "talks" ? "talk." : "speaker.",
		);
		if (
			/^(talk|speaker)\./.test(token) &&
			(!scoped || expression.argument !== undefined)
		)
			throw new ContentError("contract");
		if (element.image)
			return this.fields.image(
				token,
				scoped ? "1" : expression.argument,
				{ objectId: element.objectId, pageId },
				defaults,
			);
		this.bindings.style(element);
		return this.fields.text(
			token,
			scoped ? "1" : expression.argument,
			defaults,
		);
	}

	flatten(
		elements: readonly slides_v1.Schema$PageElement[],
	): slides_v1.Schema$PageElement[] {
		return elements.flatMap((element) => [
			element,
			...this.flatten(element.elementGroup?.children ?? []),
		]);
	}
}
