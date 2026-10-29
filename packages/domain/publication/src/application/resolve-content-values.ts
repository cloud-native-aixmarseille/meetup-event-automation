import type {
	ContentContract,
	ContentValue,
	ImageField,
	PublicAssetModel,
	TextField,
} from "../domain/asset-content.js";
import type { AssetTemplateRenderer } from "../domain/asset-template-renderer.js";
import type { ContentContractPolicy } from "../domain/content-contract-policy.js";
import { ContentError } from "../domain/content-error.js";
import type { ContentFingerprint } from "../domain/content-fingerprint.js";
import type { ContentTextKey } from "../domain/content-text-key.js";
import type { AssetImageRepository } from "./content-ports.js";

export interface ResolveContentValuesCollaborators {
	readonly templates: Pick<AssetTemplateRenderer, "value">;
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
			const text = this.text(field, model);
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

	private text(field: TextField, model: PublicAssetModel): string | undefined {
		if (field.format !== undefined) {
			const date =
				field.token === "event.date" || field.token === "next_event.date"
					? model.dates?.[field.token]
					: undefined;
			if (date) {
				return this.collaborators.templates.value({
					kind: "date",
					value: date,
					format: field.format,
				});
			}
			return field.required ? undefined : field.fallback;
		}
		const text =
			model.text[this.collaborators.contentTextKey.of(field)] ||
			(!field.required ? field.fallback : undefined);
		return text === undefined
			? undefined
			: this.collaborators.templates.value({ kind: "text", value: text });
	}

	private sourceSlot(field: ImageField): string {
		return field.sourceSlot ?? field.slot;
	}

	private async image(
		field: ImageField,
		model: PublicAssetModel,
	): Promise<ContentValue> {
		if (field.token === "event.cover") return this.cover(field, model);
		const host = field.token === "host.logo";
		const sourceSlot = this.sourceSlot(field);
		const picture = host ? model.hostLogo : model.pictures[sourceSlot];
		const hostId = host ? model.hostLogo?.hostId : undefined;
		const speakerId = host ? undefined : model.pictures[sourceSlot]?.speakerId;
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
	private async cover(
		field: ImageField,
		model: PublicAssetModel,
	): Promise<ContentValue> {
		if (!model.cover) throw new ContentError("missing");
		const validated = await this.images.validate(model.cover);
		if (validated.fingerprint !== model.cover.fingerprint)
			throw new ContentError("image");
		return {
			type: "image",
			key: field.slot,
			image: validated.source,
			fingerprint: this.collaborators.contentFingerprint.of(
				`${validated.fingerprint}:${model.cover.id}:${model.cover.description}:${field.fit}`,
			),
			fit: field.fit,
			fallback: false,
		};
	}
}
export type ResolveContentValuesArguments =
	ConstructorParameters<typeof ResolveContentValues> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
