import {
	type ContentContract,
	type ImageField,
	type ImageSource,
	SLOTTED_TEXT_TOKENS,
	TEXT_TOKENS,
	type TextField,
} from "./asset-content.js";
import { ContentError } from "./content-error.js";
import { ContentTextKey } from "./content-text-key.js";

/** Constructs a valid owned content contract; no transport decoding or effects. */
export class ContentContractPolicy {
	static parse(
		value: unknown,
		kind: string,
		mimeType: string,
	): ContentContract {
		if (
			!ContentContractPolicy.record(value) ||
			value.version !== 1 ||
			typeof value.kind !== "string" ||
			value.kind !== kind ||
			!ContentContractPolicy.name(value.revision) ||
			!Array.isArray(value.fields) ||
			!value.fields.length ||
			value.fields.length > 100 ||
			!ContentContractPolicy.keys(value, [
				"version",
				"revision",
				"kind",
				"fields",
			]) ||
			!ContentContractPolicy.supported(mimeType)
		)
			throw new ContentError("contract");
		const fields = value.fields.map((field: unknown) =>
			ContentContractPolicy.field(field, mimeType),
		);
		const keys = fields.map((field) =>
			field.type === "text" ? ContentTextKey.of(field) : field.slot,
		);
		if (new Set(keys).size !== keys.length) throw new ContentError("contract");
		return { version: 1, kind: value.kind, revision: value.revision, fields };
	}

	private static field(
		value: unknown,
		mimeType: string,
	): TextField | ImageField {
		if (!ContentContractPolicy.record(value))
			throw new ContentError("contract");
		return value.type === "text"
			? ContentContractPolicy.textField(value)
			: ContentContractPolicy.image(value, mimeType);
	}

	private static textField(field: Record<string, unknown>): TextField {
		const token = [...TEXT_TOKENS, ...SLOTTED_TEXT_TOKENS].find(
			(item) => item === field.token,
		);
		const slotted = SLOTTED_TEXT_TOKENS.some((item) => item === token);
		if (
			!token ||
			typeof field.required !== "boolean" ||
			(slotted
				? !ContentContractPolicy.name(field.slot)
				: field.slot !== undefined) ||
			!ContentContractPolicy.keys(field, [
				"type",
				"token",
				"slot",
				"required",
				"fallback",
			]) ||
			((!field.required || field.fallback !== undefined) &&
				!ContentContractPolicy.text(field.fallback))
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
		if (!ContentContractPolicy.name(ContentTextKey.of(result)))
			throw new ContentError("contract");
		return result;
	}

	private static image(
		field: Record<string, unknown>,
		mimeType: string,
	): ImageField {
		if (
			field.type !== "image" ||
			(field.token !== "speaker.picture" && field.token !== "host.logo") ||
			typeof field.required !== "boolean" ||
			!ContentContractPolicy.name(field.slot) ||
			!ContentContractPolicy.name(field.objectId) ||
			!ContentContractPolicy.keys(field, [
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
				? ContentContractPolicy.name(field.pageId) && field.tabId === undefined
				: ContentContractPolicy.name(field.tabId) &&
					field.pageId === undefined) ||
			(field.fit !== "CENTER_CROP" &&
				!(slides && field.fit === "CENTER_INSIDE"))
		)
			throw new ContentError("contract");
		const fallback = ContentContractPolicy.fallback(
			field.fallback,
			field.required,
		);
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

	private static fallback(
		value: unknown,
		required: boolean,
	): ImageSource | undefined {
		if (value === undefined && required) return undefined;
		if (
			!ContentContractPolicy.record(value) ||
			!ContentContractPolicy.text(value.url) ||
			!ContentContractPolicy.text(value.description) ||
			!ContentContractPolicy.keys(value, ["url", "description"])
		)
			throw new ContentError("contract");
		return { url: value.url, description: value.description };
	}

	static supported(mimeType: string): boolean {
		return [
			"application/vnd.google-apps.presentation",
			"application/vnd.google-apps.document",
		].includes(mimeType);
	}

	static text(value: unknown): value is string {
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

	static name(value: unknown): value is string {
		return typeof value === "string" && /^[\w.:-]{1,100}$/.test(value);
	}

	static keys(value: object, keys: readonly string[]): boolean {
		return Object.keys(value).every((key) => keys.includes(key));
	}

	static record(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
