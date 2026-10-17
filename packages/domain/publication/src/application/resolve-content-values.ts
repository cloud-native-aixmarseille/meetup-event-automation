import type {
	ContentContract,
	ContentValue,
	ImageField,
	PublicAssetModel,
} from "../domain/asset-content.js";
import { ContentContractPolicy } from "../domain/content-contract-policy.js";
import { ContentError } from "../domain/content-error.js";
import { ContentFingerprint } from "../domain/content-fingerprint.js";
import type { AssetImageRepository } from "./content-ports.js";

export class ResolveContentValues {
	constructor(private readonly images: AssetImageRepository) {}

	async execute(
		contract: ContentContract,
		model: PublicAssetModel,
	): Promise<readonly ContentValue[]> {
		const values: ContentValue[] = [];
		for (const field of contract.fields) {
			if (field.type === "image") {
				values.push(await this.image(field, model));
				continue;
			}
			const text =
				model.text[field.token] ||
				(!field.required ? field.fallback : undefined);
			if (!ContentContractPolicy.text(text)) throw new ContentError("missing");
			values.push({
				type: "text",
				key: field.token,
				text,
				fingerprint: ContentFingerprint.of(text),
			});
		}
		return values;
	}

	private async image(
		field: ImageField,
		model: PublicAssetModel,
	): Promise<ContentValue> {
		const picture = model.pictures[field.slot];
		const fallback = field.fallback
			? await this.images.validate(field.fallback)
			: undefined;
		try {
			if (!picture) throw new ContentError("image");
			const validated = await this.images.validate(picture);
			return {
				type: "image",
				key: field.slot,
				image: validated.source,
				fingerprint: ContentFingerprint.of(
					`${validated.fingerprint}:${picture.speakerId}:${picture.description}:${field.fit}`,
				),
				speakerId: picture.speakerId,
				fallback: false,
				fit: field.fit,
			};
		} catch {
			if (field.required || !field.fallback || !fallback)
				throw new ContentError("image");
			const validated = fallback;
			return {
				type: "image",
				key: field.slot,
				image: validated.source,
				fingerprint: ContentFingerprint.of(
					`${validated.fingerprint}:fallback:${field.fallback.description}:${field.fit}`,
				),
				fallback: true,
				fit: field.fit,
			};
		}
	}
}
