import type {
	ContentBinding,
	ContentContract,
} from "@meetup-automation/publication";
import {
	ContentError,
	ContentFingerprint,
} from "@meetup-automation/publication";
import { DocumentTabs, type DocumentTab } from "./document-tabs.js";

export class DocumentTemplateBindings {
	static discover(
		tabs: readonly DocumentTab[],
		contract: ContentContract,
	): readonly ContentBinding[] {
		const bindings: ContentBinding[] = [];
		for (const tab of tabs) {
			DocumentTemplateBindings.paragraphs(tab, contract, bindings);
			for (const content of [
				tab.content.headers,
				tab.content.footers,
				tab.content.footnotes,
			])
				DocumentTabs.rejectTokens(content);
			for (const field of contract.fields) {
				if (field.type !== "image" || field.tabId !== tab.id) continue;
				bindings.push({
					id: `image_${ContentFingerprint.of(`${tab.id}:${field.objectId}:${field.slot}`)}`,
					type: "image",
					key: field.slot,
					anchor: { tabId: tab.id, segmentId: "", objectId: field.objectId },
					applied: "",
				});
			}
		}
		for (const field of contract.fields) {
			const key = field.type === "text" ? field.token : field.slot;
			if (!bindings.some((binding) => binding.key === key))
				throw new ContentError("location");
		}
		return bindings;
	}

	private static paragraphs(
		tab: DocumentTab,
		contract: ContentContract,
		bindings: ContentBinding[],
	): void {
		for (const structure of tab.content.body?.content ?? []) {
			if (!structure.paragraph) {
				DocumentTabs.rejectTokens(structure);
				continue;
			}
			const text = (structure.paragraph.elements ?? [])
				.map((element) => element.textRun?.content ?? "\ufffc")
				.join("");
			if (!text.includes("{{")) continue;
			DocumentTabs.rejectSuggestions(structure);
			const matches = [...text.matchAll(/\{\{([^{}]+)\}\}/g)];
			if (text.replace(/\{\{[^{}]+\}\}/g, "").includes("{{"))
				throw new ContentError("location");
			DocumentTemplateBindings.matches(
				matches,
				structure.startIndex,
				tab.id,
				contract,
				bindings,
			);
		}
	}

	private static matches(
		matches: readonly RegExpMatchArray[],
		startIndex: number | null | undefined,
		tabId: string,
		contract: ContentContract,
		bindings: ContentBinding[],
	): void {
		for (const match of matches) {
			const field = contract.fields.find(
				(field) => field.type === "text" && field.token === match[1],
			);
			if (!field || startIndex == null) throw new ContentError("location");
			const start = startIndex + (match.index ?? 0);
			const id = `meetup_${tabId}_${start}`;
			bindings.push({
				id,
				type: "text",
				key: field.token,
				applied: "",
				anchor: {
					tabId: tabId,
					segmentId: "",
					rangeName: id,
					start,
					end: start + match[0].length,
				},
			});
		}
	}
}
