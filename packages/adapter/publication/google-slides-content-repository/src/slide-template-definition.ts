import type { SlideCollectionDefinition } from "./slide-collection-definition.js";
import type { SlideCollectionIdentity } from "./slide-collection-identity.js";
import type { ContentField } from "@meetup-automation/publication";
import type { slides_v1 } from "@googleapis/slides";
import {
	ContentError,
	type ContentTemplateFields,
	type ImageField,
	type TemplateContentDefaults,
} from "@meetup-automation/publication";
import {
	TemplateError,
	type TemplateParser,
} from "@meetup-automation/templating";
import type { SlideTemplateBindings } from "./slide-template-bindings.js";

export class SlideTemplateDefinition {
	constructor(
		private readonly collections: Pick<SlideCollectionDefinition, "read">,
		private readonly collectionIdentity: Pick<
			SlideCollectionIdentity,
			"decode"
		>,
		private readonly parser: Pick<TemplateParser, "parse" | "contains">,
		private readonly fields: Pick<
			ContentTemplateFields,
			"text" | "image" | "contract"
		>,
		private readonly bindings: Pick<SlideTemplateBindings, "text" | "discover">,
	) {}
	read(
		presentation: slides_v1.Schema$Presentation,
		kind: string,
		defaults: TemplateContentDefaults,
	) {
		const fields: ContentField[] = [];
		try {
			for (const page of presentation.slides ?? []) {
				const collections = this.collections.read(page, defaults);
				if (
					kind === "announcement" &&
					collections.some(
						(field) =>
							this.collectionIdentity.decode(field.template).mode === "slide",
					)
				)
					throw new ContentError("contract");
				fields.push(...collections);
				if (
					collections.some(
						(field) =>
							this.collectionIdentity.decode(field.template).mode === "slide",
					)
				)
					continue;
				fields.push(
					...this.page(
						{
							...page,
							pageElements: page.pageElements?.filter(
								(element) =>
									!collections.some(
										(field) => field.objectId === element.objectId,
									),
							),
						},
						defaults,
					),
				);
			}
		} catch (error) {
			if (error instanceof TemplateError) throw new ContentError("contract");
			throw error;
		}
		const contract = this.fields.contract(
			kind,
			"application/vnd.google-apps.presentation",
			fields,
		);
		this.bindings.discover(
			presentation,
			contract ?? { version: 1, revision: "empty", kind, fields: [] },
		);
		return contract;
	}
	private page(
		page: slides_v1.Schema$Page,
		defaults: TemplateContentDefaults,
	): ContentField[] {
		const fields: ContentField[] = [];
		for (const element of page.pageElements ?? []) {
			for (const expression of this.parser.parse(this.bindings.text(element))) {
				const token = expression.entity
					? `${expression.entity}.${expression.property}`
					: expression.property;
				fields.push(this.fields.text(token, expression.argument, defaults));
			}
			if (element.image && this.parser.contains(element.title ?? ""))
				fields.push(this.image(element, page.objectId, defaults));
		}
		return fields;
	}

	private image(
		element: slides_v1.Schema$PageElement,
		pageId: string | null | undefined,
		defaults: TemplateContentDefaults,
	): ImageField {
		const text = element.title ?? "";
		const expressions = this.parser.parse(text);
		if (
			expressions.length !== 1 ||
			expressions[0].start !== 0 ||
			expressions[0].end !== text.length ||
			!pageId ||
			!element.objectId
		)
			throw new ContentError("location");
		const expression = expressions[0];
		return this.fields.image(
			`${expression.entity}.${expression.property}`,
			expression.argument,
			{ objectId: element.objectId, pageId },
			defaults,
		);
	}
}
