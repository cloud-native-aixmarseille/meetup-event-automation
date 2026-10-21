import type {
	ContentContract,
	ContentValue,
	ImageField,
	PublicAssetModel,
} from "../domain/asset-content.js";
import type { ContentContractPolicy } from "../domain/content-contract-policy.js";
import { ContentError } from "../domain/content-error.js";
import type { ContentFingerprint } from "../domain/content-fingerprint.js";
import type { ContentTextKey } from "../domain/content-text-key.js";
import type { AssetImageRepository } from "./content-ports.js";

export interface ResolveContentValuesCollaborators {
	readonly contentTextKey: Pick<ContentTextKey, "of">;
	readonly contentContractPolicy: Pick<ContentContractPolicy, "text">;
	readonly contentFingerprint: Pick<ContentFingerprint, "of">;
}

export class ResolveContentValues {
	constructor(
		private readonly collaborators: ResolveContentValuesCollaborators,
		private readonly images: AssetImageRepository,
	) {}

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
			const key = this.collaborators.contentTextKey.of(field);
			const text =
				model.text[key] || (!field.required ? field.fallback : undefined);
			if (!this.collaborators.contentContractPolicy.text(text))
				throw new ContentError("missing");
			values.push({
				type: "text",
				key,
				text,
				fingerprint: this.collaborators.contentFingerprint.of(text),
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
				fingerprint: this.collaborators.contentFingerprint.of(
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
				fingerprint: this.collaborators.contentFingerprint.of(
					`${validated.fingerprint}:fallback:${field.fallback.description}:${field.fit}`,
				),
				fallback: true,
				fit: field.fit,
			};
		}
	}
}
export type ResolveContentValuesArguments =
	ConstructorParameters<typeof ResolveContentValues> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
