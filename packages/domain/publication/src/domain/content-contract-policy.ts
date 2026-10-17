import {
	type ContentContract,
	type ImageField,
	type TextField,
	TEXT_TOKENS,
	SLOTTED_TEXT_TOKENS,
} from "./asset-content.js";
import { ContentTextKey } from "./content-text-key.js";
import { ContentError } from "./content-error.js";

export class ContentContractPolicy {
	static parse(
		value: unknown,
		kind: string,
		mimeType: string,
	): ContentContract {
		const contract = value as ContentContract;
		if (
			contract?.version !== 1 ||
			contract.kind !== kind ||
			!ContentContractPolicy.name(contract.revision) ||
			!Array.isArray(contract.fields) ||
			!contract.fields.length ||
			contract.fields.length > 100 ||
			!ContentContractPolicy.keys(contract, [
				"version",
				"revision",
				"kind",
				"fields",
			]) ||
			!ContentContractPolicy.supported(mimeType)
		)
			throw new ContentError("contract");
		const keys = new Set<string>();
		for (const field of contract.fields) {
			if (!field || typeof field.required !== "boolean")
				throw new ContentError("contract");
			let key: string;
			if (field.type === "text") {
				ContentContractPolicy.textField(field);
				key = ContentTextKey.of(field);
			} else {
				ContentContractPolicy.image(field, mimeType);
				key = field.slot;
			}
			if (keys.has(key)) throw new ContentError("contract");
			keys.add(key);
		}
		return contract;
	}

	private static textField(field: TextField): void {
		const slotted = (SLOTTED_TEXT_TOKENS as readonly string[]).includes(
			field.token,
		);
		if (
			!(slotted || (TEXT_TOKENS as readonly string[]).includes(field.token)) ||
			(slotted
				? !ContentContractPolicy.name(field.slot)
				: field.slot !== undefined) ||
			!ContentContractPolicy.name(ContentTextKey.of(field)) ||
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

	private static image(field: ImageField, mimeType: string): void {
		if (
			field.type !== "image" ||
			!["speaker.picture", "host.logo"].includes(field.token) ||
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
				? ContentContractPolicy.name(field.pageId) && !field.tabId
				: ContentContractPolicy.name(field.tabId) && !field.pageId) ||
			!(
				field.fit === "CENTER_CROP" ||
				(slides && field.fit === "CENTER_INSIDE")
			)
		)
			throw new ContentError("contract");
		if (!field.required || field.fallback) {
			if (
				!field.fallback ||
				!ContentContractPolicy.text(field.fallback.url) ||
				!ContentContractPolicy.text(field.fallback.description) ||
				!ContentContractPolicy.keys(field.fallback, ["url", "description"])
			)
				throw new ContentError("contract");
		}
	}
}
