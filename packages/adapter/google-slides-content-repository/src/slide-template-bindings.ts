import type { slides_v1 } from "@googleapis/slides";
import {
	ContentError,
	type ContentContract,
	type ContentBinding,
} from "@meetup-automation/publication";

export class SlideTemplateBindings {
	static discover(
		presentation: slides_v1.Schema$Presentation,
		contract: ContentContract,
	): readonly ContentBinding[] {
		const bindings: ContentBinding[] = [];
		for (const page of presentation.slides ?? []) {
			if (!page.objectId) throw new ContentError("location");
			for (const element of page.pageElements ?? [])
				SlideTemplateBindings.element(
					element,
					page.objectId,
					contract,
					bindings,
				);
			SlideTemplateBindings.rejectTokens(page.slideProperties?.notesPage);
		}
		SlideTemplateBindings.rejectTokens(presentation.masters);
		SlideTemplateBindings.rejectTokens(presentation.layouts);
		for (const field of contract.fields) {
			const key = field.type === "text" ? field.token : field.slot;
			if (!bindings.some((binding) => binding.key === key))
				throw new ContentError("location");
		}
		return bindings;
	}

	private static element(
		element: slides_v1.Schema$PageElement,
		pageId: string,
		contract: ContentContract,
		bindings: ContentBinding[],
	): void {
		const objectId = element.objectId;
		if (!objectId) throw new ContentError("location");
		const text = SlideTemplateBindings.text(element);
		if (element.shape && text.includes("{{")) {
			const field = contract.fields.find(
				(field) => field.type === "text" && text === `{{${field.token}}}`,
			);
			if (!field) throw new ContentError("location");
			SlideTemplateBindings.style(element);
			bindings.push({
				id: objectId,
				type: "text",
				key: field.token,
				anchor: { objectId, pageId },
				applied: "",
			});
		}
		SlideTemplateBindings.rejectTokens(element.table);
		SlideTemplateBindings.rejectTokens(element.elementGroup);
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

	static text(element: slides_v1.Schema$PageElement): string {
		return (element.shape?.text?.textElements ?? [])
			.map((item) => item.textRun?.content ?? "")
			.join("")
			.replace(/\n$/, "");
	}

	static style(
		element: slides_v1.Schema$PageElement,
	): slides_v1.Schema$TextStyle {
		const runs = (element.shape?.text?.textElements ?? []).filter((item) =>
			item.textRun?.content?.trim(),
		);
		if (
			new Set(runs.map((item) => JSON.stringify(item.textRun?.style ?? {})))
				.size > 1
		)
			throw new ContentError("location");
		return runs[0]?.textRun?.style ?? {};
	}

	private static rejectTokens(value: unknown): void {
		if (SlideTemplateBindings.allText(value).includes("{{"))
			throw new ContentError("location");
	}

	private static allText(value: unknown): string {
		if (!value || typeof value !== "object") return "";
		return Object.entries(value)
			.map(([key, item]) =>
				key === "content" && typeof item === "string"
					? item
					: SlideTemplateBindings.allText(item),
			)
			.join("");
	}
}
