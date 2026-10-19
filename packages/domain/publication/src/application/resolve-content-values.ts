import type {
	ContentContract,
	ContentValue,
	ImageField,
	PublicAssetModel,
} from "../domain/asset-content.js";
import { ContentContractPolicy } from "../domain/content-contract-policy.js";
import { ContentError } from "../domain/content-error.js";
import { ContentFingerprint } from "../domain/content-fingerprint.js";
import { ContentTextKey } from "../domain/content-text-key.js";
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
			const key = ContentTextKey.of(field);
			const text =
				model.text[key] || (!field.required ? field.fallback : undefined);
			if (!ContentContractPolicy.text(text)) throw new ContentError("missing");
			values.push({
				type: "text",
				key,
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
		const host = field.token === "host.logo";
		const picture = host ? model.hostLogo : model.pictures[field.slot];
		const hostId = host ? model.hostLogo?.hostId : undefined;
		const speakerId = host ? undefined : model.pictures[field.slot]?.speakerId;
		const identity = hostId ?? speakerId;
		const fallback = field.fallback
			? await this.images.validate(field.fallback)
			: undefined;
		try {
			if (
				!picture ||
				!(host ? /^host-[a-z0-9-]+$/ : /^speaker-[a-z0-9-]+$/).test(
					identity ?? "",
				)
			)
				throw new ContentError("image");
			const validated = await this.images.validate(picture);
			return {
				type: "image",
				key: field.slot,
				image: validated.source,
				fingerprint: ContentFingerprint.of(
					`${validated.fingerprint}:${identity}:${picture.description}:${field.fit}`,
				),
				speakerId,
				hostId,
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
