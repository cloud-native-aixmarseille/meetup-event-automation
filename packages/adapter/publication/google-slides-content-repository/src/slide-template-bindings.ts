import { isDeepStrictEqual } from "node:util";
import type { slides_v1 } from "@googleapis/slides";
import {
	type ContentBinding,
	type ContentContract,
	ContentError,
	type ContentTextKey,
} from "@meetup-automation/publication";
import {
	TemplateError,
	type TemplateOccurrence,
	type TemplateParser,
} from "@meetup-automation/templating";

export interface SlideTemplateBindingsCollaborators {
	readonly contentTextKey: Pick<ContentTextKey, "of" | "reference">;
	readonly templates: Pick<TemplateParser, "parse" | "contains">;
}

export class SlideTemplateBindings {
	constructor(
		private readonly collaborators: SlideTemplateBindingsCollaborators,
	) {}

	discover(
		presentation: slides_v1.Schema$Presentation,
		contract: ContentContract,
	): readonly ContentBinding[] {
		const bindings: ContentBinding[] = [];
		for (const page of presentation.slides ?? []) {
			if (!page.objectId) throw new ContentError("location");
			for (const element of page.pageElements ?? [])
				this.element(element, page.objectId, contract, bindings);
			this.rejectTokens(page.slideProperties?.notesPage);
		}
		this.rejectTokens(presentation.masters);
		this.rejectTokens(presentation.layouts);
		for (const field of contract.fields) {
			const key =
				field.type === "text"
					? this.collaborators.contentTextKey.of(field)
					: field.slot;
			if (!bindings.some((binding) => binding.key === key))
				throw new ContentError("location");
		}
		return bindings;
	}

	private element(
		element: slides_v1.Schema$PageElement,
		pageId: string,
		contract: ContentContract,
		bindings: ContentBinding[],
	): void {
		const objectId = element.objectId;
		if (!objectId) throw new ContentError("location");
		const text = this.text(element);
		if (!element.image) this.rejectTokens({ title: element.title });
		if (element.shape && this.collaborators.templates.contains(text)) {
			const expressions = this.expressions(text);
			if (
				expressions.length !== 1 ||
				expressions[0].start !== 0 ||
				expressions[0].end !== text.length
			)
				throw new ContentError("location");
			const field = contract.fields.find(
				(field) =>
					field.type === "text" &&
					expressions[0].reference ===
						this.collaborators.contentTextKey.reference(field),
			);
			if (field?.type !== "text") throw new ContentError("location");
			this.style(element);
			bindings.push({
				id: objectId,
				type: "text",
				key: this.collaborators.contentTextKey.of(field),
				anchor: { objectId, pageId },
				applied: "",
			});
		}
		this.rejectTokens(element.table);
		this.rejectTokens(element.elementGroup);
		this.images(element, pageId, contract, bindings);
	}

	private images(
		element: slides_v1.Schema$PageElement,
		pageId: string,
		contract: ContentContract,
		bindings: ContentBinding[],
	): void {
		const objectId = element.objectId;
		if (!objectId) throw new ContentError("location");

		for (const field of contract.fields) {
			if (
				field.type !== "image" ||
				field.objectId !== objectId ||
				field.pageId !== pageId
			)
				continue;
			if (!element.image || !element.description?.trim())
				throw new ContentError("location");
			bindings.push({
				id: objectId,
				type: "image",
				key: field.slot,
				anchor: { objectId, pageId },
				applied: "",
			});
		}
	}

	text(element: slides_v1.Schema$PageElement): string {
		return (element.shape?.text?.textElements ?? [])
			.map((item) => item.textRun?.content ?? "")
			.join("")
			.replace(/\n$/, "");
	}

	style(element: slides_v1.Schema$PageElement): slides_v1.Schema$TextStyle {
		const runs = (element.shape?.text?.textElements ?? []).filter((item) =>
			item.textRun?.content?.trim(),
		);
		const style = runs[0]?.textRun?.style ?? {};
		if (
			runs.some((item) => !isDeepStrictEqual(item.textRun?.style ?? {}, style))
		)
			throw new ContentError("location");
		return style;
	}

	private rejectTokens(value: unknown): void {
		if (this.collaborators.templates.contains(this.allText(value)))
			throw new ContentError("location");
	}

	private expressions(text: string): readonly TemplateOccurrence[] {
		try {
			return this.collaborators.templates.parse(text);
		} catch (error) {
			if (error instanceof TemplateError) throw new ContentError("location");
			throw error;
		}
	}

	private allText(value: unknown): string {
		if (!value || typeof value !== "object") return "";
		return Object.entries(value)
			.map(([key, item]) =>
				["content", "title", "description"].includes(key) &&
				typeof item === "string"
					? item
					: this.allText(item),
			)
			.join("");
	}
}
