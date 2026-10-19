import type {
	ContentBinding,
	ContentContract,
} from "@meetup-automation/publication";
import {
	ContentError,
	type ContentFingerprint,
	type ContentTextKey,
} from "@meetup-automation/publication";
import {
	TemplateError,
	type TemplateOccurrence,
	type TemplateParser,
} from "@meetup-automation/templating";
import type { DocumentTab, DocumentTabs } from "./document-tabs.js";

export interface DocumentTemplateBindingsCollaborators {
	readonly documentTabs: Pick<
		DocumentTabs,
		"rejectTokens" | "rejectSuggestions"
	>;
	readonly contentFingerprint: Pick<ContentFingerprint, "of">;
	readonly contentTextKey: Pick<ContentTextKey, "of" | "reference">;
	readonly templates: Pick<TemplateParser, "parse" | "contains">;
}

export class DocumentTemplateBindings {
	constructor(
		private readonly collaborators: DocumentTemplateBindingsCollaborators,
	) {}

	discover(
		tabs: readonly DocumentTab[],
		contract: ContentContract,
	): readonly ContentBinding[] {
		const bindings: ContentBinding[] = [];
		for (const tab of tabs) {
			this.paragraphs(tab, contract, bindings);
			for (const content of [
				tab.content.headers,
				tab.content.footers,
				tab.content.footnotes,
			])
				this.collaborators.documentTabs.rejectTokens(content);
			for (const field of contract.fields) {
				if (field.type !== "image" || field.tabId !== tab.id) continue;
				bindings.push({
					id: `image_${this.collaborators.contentFingerprint.of(`${tab.id}:${field.objectId}:${field.slot}`)}`,
					type: "image",
					key: field.slot,
					anchor: { tabId: tab.id, segmentId: "", objectId: field.objectId },
					applied: "",
				});
			}
		}
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

	private paragraphs(
		tab: DocumentTab,
		contract: ContentContract,
		bindings: ContentBinding[],
	): void {
		for (const structure of tab.content.body?.content ?? []) {
			if (!structure.paragraph) {
				this.collaborators.documentTabs.rejectTokens(structure);
				continue;
			}
			const text = (structure.paragraph.elements ?? [])
				.map((element) => element.textRun?.content ?? "\ufffc")
				.join("");
			if (!this.collaborators.templates.contains(text)) continue;
			this.collaborators.documentTabs.rejectSuggestions(structure);
			const matches = this.expressions(text);
			this.matches(matches, structure.startIndex, tab.id, contract, bindings);
		}
	}

	private matches(
		matches: readonly TemplateOccurrence[],
		startIndex: number | null | undefined,
		tabId: string,
		contract: ContentContract,
		bindings: ContentBinding[],
	): void {
		for (const match of matches) {
			const field = contract.fields.find(
				(field) =>
					field.type === "text" &&
					this.collaborators.contentTextKey.reference(field) ===
						match.reference,
			);
			if (field?.type !== "text" || startIndex == null)
				throw new ContentError("location");
			const start = startIndex + match.start;
			const id = `meetup_${tabId}_${start}`;
			bindings.push({
				id,
				type: "text",
				key: this.collaborators.contentTextKey.of(field),
				applied: "",
				anchor: {
					tabId: tabId,
					segmentId: "",
					rangeName: id,
					start,
					end: startIndex + match.end,
				},
			});
		}
	}

	private expressions(text: string): readonly TemplateOccurrence[] {
		try {
			return this.collaborators.templates.parse(text);
		} catch (error) {
			if (error instanceof TemplateError) throw new ContentError("location");
			throw error;
		}
	}
}
