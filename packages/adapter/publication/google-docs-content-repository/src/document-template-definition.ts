import {
	ContentError,
	type ContentTemplateFields,
	type ImageField,
	type TemplateContentDefaults,
	type TextField,
} from "@meetup-automation/publication";
import {
	TemplateError,
	type TemplateParser,
} from "@meetup-automation/templating";
import type { DocumentTab } from "./document-tabs.js";
import type { DocumentTemplateBindings } from "./document-template-bindings.js";

export class DocumentTemplateDefinition {
	constructor(
		private readonly parser: Pick<TemplateParser, "parse" | "contains">,
		private readonly fields: Pick<
			ContentTemplateFields,
			"text" | "image" | "contract"
		>,
		private readonly bindings: Pick<DocumentTemplateBindings, "discover">,
	) {}
	read(
		tabs: readonly DocumentTab[],
		kind: string,
		defaults: TemplateContentDefaults,
	) {
		const fields: (TextField | ImageField)[] = [];
		try {
			for (const tab of tabs) {
				fields.push(...this.text(tab, defaults));
				fields.push(...this.images(tab, defaults));
			}
		} catch (error) {
			if (error instanceof TemplateError) throw new ContentError("contract");
			throw error;
		}
		const contract = this.fields.contract(
			kind,
			"application/vnd.google-apps.document",
			fields,
		);
		this.bindings.discover(
			tabs,
			contract ?? { version: 1, revision: "empty", kind, fields: [] },
		);
		return contract;
	}
	private text(
		tab: DocumentTab,
		defaults: TemplateContentDefaults,
	): TextField[] {
		const fields: TextField[] = [];
		for (const structure of tab.content.body?.content ?? []) {
			const text = (structure.paragraph?.elements ?? [])
				.map((element) => element.textRun?.content ?? "\ufffc")
				.join("");
			for (const expression of this.parser.parse(text)) {
				const token = expression.entity
					? `${expression.entity}.${expression.property}`
					: expression.property;
				fields.push(this.fields.text(token, expression.argument, defaults));
			}
		}
		return fields;
	}

	private images(
		tab: DocumentTab,
		defaults: TemplateContentDefaults,
	): ImageField[] {
		const fields: ImageField[] = [];
		for (const [objectId, inline] of Object.entries(
			tab.content.inlineObjects ?? {},
		)) {
			const object = inline.inlineObjectProperties?.embeddedObject;
			const title = object?.title ?? "";
			if (!this.parser.contains(title)) continue;
			const expressions = this.parser.parse(title);
			if (
				!object?.imageProperties ||
				expressions.length !== 1 ||
				expressions[0].start !== 0 ||
				expressions[0].end !== title.length
			)
				throw new ContentError("location");
			const expression = expressions[0];
			fields.push(
				this.fields.image(
					`${expression.entity}.${expression.property}`,
					expression.argument,
					{ objectId, tabId: tab.id },
					defaults,
				),
			);
		}
		return fields;
	}
}
