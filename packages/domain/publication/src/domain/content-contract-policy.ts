import {
	type ContentContract,
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

	private field(value: unknown, mimeType: string): TextField | ImageField {
		if (!this.record(value)) throw new ContentError("contract");
		return value.type === "text"
			? this.textField(value)
			: this.image(value, mimeType);
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
			!this.keys(field, ["type", "token", "slot", "required", "fallback"]) ||
			((!field.required || field.fallback !== undefined) &&
				!this.text(field.fallback))
		)
			throw new ContentError("contract");
		const result: TextField = {
			type: "text",
			token,
			required: field.required,
			...(typeof field.slot === "string" ? { slot: field.slot } : {}),
			...(typeof field.fallback === "string"
				? { fallback: field.fallback }
				: {}),
		};
		if (!this.name(this.collaborators.contentTextKey.of(result)))
			throw new ContentError("contract");
		return result;
	}

	private image(field: Record<string, unknown>, mimeType: string): ImageField {
		if (
			field.type !== "image" ||
			(field.token !== "speaker.picture" && field.token !== "host.logo") ||
			typeof field.required !== "boolean" ||
			!this.name(field.slot) ||
			!this.name(field.objectId) ||
			!this.keys(field, [
				"type",
				"token",
				"slot",
				"objectId",
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
		const fallback = this.fallback(field.fallback, field.required);
		return {
			type: "image",
			token: field.token,
			required: field.required,
			slot: field.slot,
			objectId: field.objectId,
			fit: field.fit,
			...(typeof field.pageId === "string" ? { pageId: field.pageId } : {}),
			...(typeof field.tabId === "string" ? { tabId: field.tabId } : {}),
			...(fallback ? { fallback } : {}),
		};
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
