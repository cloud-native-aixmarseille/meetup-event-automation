import {
	type ContentAnchor,
	type ContentContract,
	type ImageField,
	SLOTTED_TEXT_TOKENS,
	TEXT_TOKENS,
	type TemplateContentDefaults,
	type TextField,
} from "./asset-content.js";
import type { ContentContractPolicy } from "./content-contract-policy.js";
import { ContentError } from "./content-error.js";
import type { ContentFingerprint } from "./content-fingerprint.js";
import type { ContentTextKey } from "./content-text-key.js";

/** Supported document fields, independent of provider payloads and template syntax. */
export class ContentTemplateFields {
	constructor(
		private readonly policy: Pick<ContentContractPolicy, "parse">,
		private readonly keys: Pick<ContentTextKey, "of">,
		private readonly fingerprints: Pick<ContentFingerprint, "of">,
	) {}

	text(
		token: string,
		operand: string | undefined,
		defaults: TemplateContentDefaults,
	): TextField {
		const known = [...TEXT_TOKENS, ...SLOTTED_TEXT_TOKENS].find(
			(item) => item === token,
		);
		if (!known) throw new ContentError("contract");
		const slotted = SLOTTED_TEXT_TOKENS.some((item) => item === known);
		const date = known === "event.date" || known === "next_event.date";
		if (slotted ? !this.position(operand) : operand !== undefined && !date)
			throw new ContentError("contract");
		const fallback = known.startsWith("next_event.")
			? defaults.missingNextEvent
			: known === "talk.abstract"
				? defaults.missingAbstract
				: undefined;
		return {
			type: "text",
			token: known,
			required: fallback === undefined,
			...(slotted ? { slot: operand } : {}),
			...(date && operand !== undefined ? { format: operand } : {}),
			...(fallback === undefined ? {} : { fallback }),
		};
	}

	image(
		token: string,
		operand: string | undefined,
		anchor: ContentAnchor,
		defaults: TemplateContentDefaults,
	): ImageField {
		if (
			(token !== "speaker.picture" &&
				token !== "host.logo" &&
				token !== "event.cover") ||
			!anchor.objectId
		)
			throw new ContentError("contract");
		if (
			token === "speaker.picture"
				? !this.position(operand)
				: operand !== undefined
		)
			throw new ContentError("contract");
		return {
			type: "image",
			token,
			slot: anchor.objectId,
			...(operand === undefined ? {} : { sourceSlot: operand }),
			objectId: anchor.objectId,
			...(anchor.pageId ? { pageId: anchor.pageId } : {}),
			...(anchor.tabId ? { tabId: anchor.tabId } : {}),
			required: token === "event.cover",
			fit:
				token === "host.logo" && anchor.pageId
					? "CENTER_INSIDE"
					: "CENTER_CROP",
			...(token === "event.cover"
				? {}
				: {
						fallback: token === "host.logo" ? defaults.host : defaults.speaker,
					}),
		};
	}

	contract(
		kind: string,
		mimeType: string,
		fields: readonly (TextField | ImageField)[],
	): ContentContract | undefined {
		if (!fields.length) return undefined;
		const distinct = new Map<string, TextField | ImageField>();
		for (const field of fields) {
			const key = field.type === "text" ? this.keys.of(field) : field.slot;
			if (
				distinct.has(key) &&
				(field.type === "image" || distinct.get(key)?.type === "image")
			)
				throw new ContentError("contract");
			distinct.set(key, field);
		}
		const values = [...distinct.values()];
		return this.policy.parse(
			{
				version: 1,
				kind,
				revision: `template-${this.fingerprints.of(JSON.stringify(values))}`,
				fields: values,
			},
			kind,
			mimeType,
		);
	}

	validateSelectors(contract: ContentContract): void {
		for (const field of contract.fields) {
			if (
				field.type === "image" &&
				field.token === "speaker.picture" &&
				!this.position(field.sourceSlot)
			)
				throw new ContentError("contract");
			if (
				field.type === "text" &&
				SLOTTED_TEXT_TOKENS.some((token) => token === field.token) &&
				!this.position(field.slot)
			)
				throw new ContentError("contract");
		}
	}

	private position(value: string | undefined): boolean {
		return (
			value !== undefined &&
			/^[1-9]\d{0,2}$/.test(value) &&
			Number(value) <= 200
		);
	}
}
