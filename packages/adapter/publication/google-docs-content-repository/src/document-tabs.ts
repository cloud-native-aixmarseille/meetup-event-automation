import type { docs_v1 } from "@googleapis/docs";
import { ContentError } from "@meetup-automation/publication";
import type { TemplateParser } from "@meetup-automation/templating";

export type DocumentTab = { id: string; content: docs_v1.Schema$DocumentTab };

export class DocumentTabs {
	constructor(private readonly templates: Pick<TemplateParser, "contains">) {}
	all(document: docs_v1.Schema$Document): readonly DocumentTab[] {
		const result: DocumentTab[] = [];
		this.visit(document.tabs ?? [], result);
		if (
			!result.length ||
			new Set(result.map((tab) => tab.id)).size !== result.length
		)
			throw new ContentError("location");
		return result;
	}

	private visit(
		tabs: readonly docs_v1.Schema$Tab[],
		result: DocumentTab[],
	): void {
		for (const tab of tabs) {
			if (!tab.tabProperties?.tabId || !tab.documentTab)
				throw new ContentError("location");
			result.push({ id: tab.tabProperties.tabId, content: tab.documentTab });
			this.visit(tab.childTabs ?? [], result);
		}
	}

	text(tab: DocumentTab, start: number, end: number): string {
		let text = "";
		const elements = (tab.content.body?.content ?? []).flatMap(
			(structure) => structure.paragraph?.elements ?? [],
		);
		for (const element of elements) {
			if ((element.startIndex ?? 0) >= end || (element.endIndex ?? 0) <= start)
				continue;
			this.rejectSuggestions(element);
			if (!element.textRun?.content) throw new ContentError("location");
			text += element.textRun.content.slice(
				Math.max(0, start - (element.startIndex ?? 0)),
				end - (element.startIndex ?? 0),
			);
		}
		if (text.length !== end - start) throw new ContentError("location");
		return text;
	}

	rejectSuggestions(value: unknown): void {
		if (!value || typeof value !== "object") return;
		for (const [key, item] of Object.entries(value)) {
			if (key.startsWith("suggested") && item && Object.keys(item).length)
				throw new ContentError("location");
			this.rejectSuggestions(item);
		}
	}

	rejectTokens(value: unknown): void {
		if (this.templates.contains(this.allText(value)))
			throw new ContentError("location");
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
