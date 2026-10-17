import type { docs_v1 } from "@googleapis/docs";
import { ContentError } from "@meetup-automation/publication";

export type DocumentTab = { id: string; content: docs_v1.Schema$DocumentTab };

export class DocumentTabs {
	static all(document: docs_v1.Schema$Document): readonly DocumentTab[] {
		const result: DocumentTab[] = [];
		DocumentTabs.visit(document.tabs ?? [], result);
		if (
			!result.length ||
			new Set(result.map((tab) => tab.id)).size !== result.length
		)
			throw new ContentError("location");
		return result;
	}

	private static visit(
		tabs: readonly docs_v1.Schema$Tab[],
		result: DocumentTab[],
	): void {
		for (const tab of tabs) {
			if (!tab.tabProperties?.tabId || !tab.documentTab)
				throw new ContentError("location");
			result.push({ id: tab.tabProperties.tabId, content: tab.documentTab });
			DocumentTabs.visit(tab.childTabs ?? [], result);
		}
	}

	static text(tab: DocumentTab, start: number, end: number): string {
		let text = "";
		const elements = (tab.content.body?.content ?? []).flatMap(
			(structure) => structure.paragraph?.elements ?? [],
		);
		for (const element of elements) {
			if ((element.startIndex ?? 0) >= end || (element.endIndex ?? 0) <= start)
				continue;
			DocumentTabs.rejectSuggestions(element);
			if (!element.textRun?.content) throw new ContentError("location");
			text += element.textRun.content.slice(
				Math.max(0, start - (element.startIndex ?? 0)),
				end - (element.startIndex ?? 0),
			);
		}
		if (text.length !== end - start) throw new ContentError("location");
		return text;
	}

	static rejectSuggestions(value: unknown): void {
		if (!value || typeof value !== "object") return;
		for (const [key, item] of Object.entries(value)) {
			if (key.startsWith("suggested") && item && Object.keys(item).length)
				throw new ContentError("location");
			DocumentTabs.rejectSuggestions(item);
		}
	}

	static rejectTokens(value: unknown): void {
		if (DocumentTabs.allText(value).includes("{{"))
			throw new ContentError("location");
	}

	private static allText(value: unknown): string {
		if (!value || typeof value !== "object") return "";
		return Object.entries(value)
			.map(([key, item]) =>
				key === "content" && typeof item === "string"
					? item
					: DocumentTabs.allText(item),
			)
			.join("");
	}
}
