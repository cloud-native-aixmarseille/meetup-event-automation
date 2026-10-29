import {
	type ContentContract,
	type ContentField,
	type CollectionField,
	type ImageField,
	type ImageSource,
	SLOTTED_TEXT_TOKENS,
	TEXT_TOKENS,
	type TextField,
} from "./asset-content.js";
import { ContentError } from "./content-error.js";
import type { ContentTextKey } from "./content-text-key.js";

/** Constructs a valid owned content contract; no transport decoding or effects. */
export interface ContentContractPolicyCollaborators {
	readonly contentTextKey: Pick<ContentTextKey, "of">;
}

export class ContentContractPolicy {
	constructor(
		private readonly collaborators: ContentContractPolicyCollaborators,
	) {}

	parse(value: unknown, kind: string, mimeType: string): ContentContract {
		if (
			!this.record(value) ||
			value.version !== 1 ||
			typeof value.kind !== "string" ||
			value.kind !== kind ||
			!this.name(value.revision) ||
			!Array.isArray(value.fields) ||
			!value.fields.length ||
			value.fields.length > 100 ||
			!this.keys(value, ["version", "revision", "kind", "fields"]) ||
			!this.supported(mimeType)
		)
			throw new ContentError("contract");
		const fields = value.fields.map((field: unknown) =>
			this.field(field, mimeType),
		);
		const keys = fields.map((field) =>
			field.type === "text"
				? this.collaborators.contentTextKey.of(field)
				: field.slot,
		);
		if (new Set(keys).size !== keys.length) throw new ContentError("contract");
		return { version: 1, kind: value.kind, revision: value.revision, fields };
	}

	private field(value: unknown, mimeType: string): ContentField {
		if (!this.record(value)) throw new ContentError("contract");
		if (value.type === "collection") return this.collection(value, mimeType);
		return value.type === "text"
			? this.textField(value)
			: this.image(value, mimeType);
	}

	private collection(
		value: Record<string, unknown>,
		mimeType: string,
	): CollectionField {
		if (
			!mimeType.endsWith("presentation") ||
			(value.token !== "talks" && value.token !== "speakers") ||
			!this.name(value.slot) ||
			!this.name(value.objectId) ||
			!this.name(value.pageId) ||
			typeof value.template !== "string" ||
			value.template.length > 100_000 ||
			!Array.isArray(value.fields) ||
			!value.fields.length ||
			value.fields.length > 100 ||
			!this.keys(value, [
				"type",
				"token",
				"slot",
				"objectId",
				"pageId",
				"template",
				"fields",
			])
		)
			throw new ContentError("contract");
		const fields = value.fields.map((item: unknown) => {
			if (!this.record(item) || item.type === "collection")
				throw new ContentError("contract");
			return item.type === "text"
				? this.textField(item)
				: this.image(item, mimeType);
		});
		const scope = value.token === "talks" ? "talk." : "speaker.";
		if (
			fields.some(
				(field) =>
					/^(talk|speaker)\./.test(field.token) &&
					!field.token.startsWith(scope),
			)
		)
			throw new ContentError("contract");
		return {
			type: "collection",
			token: value.token,
			slot: value.slot,
			objectId: value.objectId,
			pageId: value.pageId,
			template: value.template,
			fields,
		};
	}

	private textField(field: Record<string, unknown>): TextField {
		const token = [...TEXT_TOKENS, ...SLOTTED_TEXT_TOKENS].find(
			(item) => item === field.token,
		);
		const slotted = SLOTTED_TEXT_TOKENS.some((item) => item === token);
		if (
			!token ||
			typeof field.required !== "boolean" ||
			(slotted ? !this.name(field.slot) : field.slot !== undefined) ||
			!this.validFormat(field) ||
			!this.keys(field, [
				"type",
				"token",
				"slot",
				"format",
				"required",
				"fallback",
			]) ||
			((!field.required || field.fallback !== undefined) &&
				!this.text(field.fallback))
		)
			throw new ContentError("contract");
		const result: TextField = {
			type: "text",
			token,
			required: field.required,
			...(typeof field.slot === "string" ? { slot: field.slot } : {}),
			...(typeof field.format === "string" ? { format: field.format } : {}),
			...(typeof field.fallback === "string"
				? { fallback: field.fallback }
				: {}),
		};
		if (!this.name(this.collaborators.contentTextKey.of(result)))
			throw new ContentError("contract");
		return result;
	}

	private validFormat(field: Record<string, unknown>): boolean {
		return (
			field.format === undefined ||
			((field.token === "event.date" || field.token === "next_event.date") &&
				typeof field.format === "string" &&
				field.format.trim().length > 0 &&
				field.format.length <= 100 &&
				/^[A-Za-z ./_-]+$/u.test(field.format))
		);
	}

	private image(field: Record<string, unknown>, mimeType: string): ImageField {
		if (
			field.type !== "image" ||
			(field.token !== "speaker.picture" &&
				field.token !== "host.logo" &&
				field.token !== "event.cover") ||
			typeof field.required !== "boolean" ||
			!this.name(field.slot) ||
			!this.name(field.objectId) ||
			!this.validSourceSlot(field) ||
			!this.keys(field, [
				"type",
				"token",
				"slot",
				"objectId",
				"sourceSlot",
				"pageId",
				"tabId",
				"required",
				"fallback",
				"fit",
			])
		)
			throw new ContentError("contract");
		const slides = mimeType === "application/vnd.google-apps.presentation";
		if (
			!(slides
				? this.name(field.pageId) && field.tabId === undefined
				: this.name(field.tabId) && field.pageId === undefined) ||
			(field.fit !== "CENTER_CROP" &&
				!(slides && field.fit === "CENTER_INSIDE"))
		)
			throw new ContentError("contract");
		this.coverContract(field);
		const fallback = this.fallback(field.fallback, field.required);
		return {
			type: "image",
			token: field.token,
			required: field.required,
			slot: field.slot,
			...(typeof field.sourceSlot === "string"
				? { sourceSlot: field.sourceSlot }
				: {}),
			objectId: field.objectId,
			fit: field.fit,
			...(typeof field.pageId === "string" ? { pageId: field.pageId } : {}),
			...(typeof field.tabId === "string" ? { tabId: field.tabId } : {}),
			...(fallback ? { fallback } : {}),
		};
	}

	private validSourceSlot(field: Record<string, unknown>): boolean {
		return (
			field.sourceSlot === undefined ||
			(field.token === "speaker.picture" &&
				typeof field.sourceSlot === "string" &&
				/^[1-9]\d{0,2}$/.test(field.sourceSlot) &&
				Number(field.sourceSlot) <= 200)
		);
	}

	private coverContract(field: Record<string, unknown>): void {
		if (
			field.token === "event.cover" &&
			(!field.required || field.fallback !== undefined)
		)
			throw new ContentError("contract");
	}

	private fallback(value: unknown, required: boolean): ImageSource | undefined {
		if (value === undefined && required) return undefined;
		if (
			!this.record(value) ||
			!this.text(value.url) ||
			!this.text(value.description) ||
			!this.keys(value, ["url", "description"])
		)
			throw new ContentError("contract");
		return { url: value.url, description: value.description };
	}

	supported(mimeType: string): boolean {
		return [
			"application/vnd.google-apps.presentation",
			"application/vnd.google-apps.document",
		].includes(mimeType);
	}

	text(value: unknown): value is string {
		return (
			typeof value === "string" &&
			value.trim().length > 0 &&
			value.length <= 20_000 &&
			[...value].every((character) => {
				const code = character.charCodeAt(0);
				return (
					(code >= 32 || code === 9 || code === 10) &&
					(code < 0xe000 || code > 0xf8ff)
				);
			})
		);
	}

	name(value: unknown): value is string {
		return typeof value === "string" && /^[\w.:-]{1,100}$/.test(value);
	}

	keys(value: object, keys: readonly string[]): boolean {
		return Object.keys(value).every((key) => keys.includes(key));
	}

	record(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
