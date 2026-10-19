import { PublicationDomainComposition } from "@meetup-automation/publication";
import { vi } from "vitest";
import type {
	AssetContentRepository,
	AssetImageRepository,
	AssetManifestRepository,
} from "../src/application/content-ports.js";
import { ReconcileAssetContent } from "../src/application/reconcile-asset-content.js";
import type {
	ContentBinding,
	ContentContract,
	ContentManifest,
	ContentValue,
	ImageField,
	PublicAssetModel,
	TextField,
} from "../src/domain/asset-content.js";

export const mimeType = "application/vnd.google-apps.presentation";
export const contract: ContentContract = {
	version: 1,
	revision: "v1",
	kind: "slides",
	fields: [{ type: "text", token: "event.title", required: true }],
};
export const model: PublicAssetModel = {
	text: { "event.title": "Public meetup" },
	pictures: {},
};

export function contentDependencies(
	image = false,
	textField: TextField = { type: "text", token: "event.title", required: true },
	imageToken: ImageField["token"] = "speaker.picture",
) {
	const textKey = new PublicationDomainComposition()
		.contentTextKey()
		.of(textField);
	const imageSlot = imageToken === "host.logo" ? "host-logo" : "portrait";
	const imageField = {
		type: "image",
		token: imageToken,
		slot: imageSlot,
		objectId: "image",
		pageId: "page",
		required: false,
		fallback: {
			url: "https://images.example.org/generic.png",
			description: "Speaker portrait",
		},
		fit: "CENTER_CROP",
	} as const;
	const fields: ContentContract = {
		...contract,
		fields: image ? [textField, imageField] : [textField],
	};
	const bindings: ContentBinding[] = [
		{
			id: "title",
			type: "text",
			key: textKey,
			anchor: { objectId: "title", pageId: "page" },
			applied: "",
		},
	];
	if (image)
		bindings.push({
			id: "image",
			type: "image",
			key: imageSlot,
			anchor: { objectId: "image", pageId: "page" },
			applied: "",
		});
	const state = {
		manifest: undefined as ContentManifest | undefined,
		revision: 1,
		failAfterApply: false,
		content: new Map(
			bindings.map((binding) => [
				binding.id,
				new PublicationDomainComposition()
					.contentFingerprint()
					.of(binding.type === "text" ? `{{${textKey}}}` : "original image"),
			]),
		),
		sourceVersion: "source-v1",
	};
	const manifests: AssetManifestRepository = {
		load: vi.fn(async () => state.manifest),
		save: vi.fn(async (_folder, manifest) => {
			state.manifest = JSON.parse(JSON.stringify(manifest));
		}),
	};
	const images: AssetImageRepository = {
		validate: vi.fn(async (source) => ({
			source,
			fingerprint: new PublicationDomainComposition()
				.contentFingerprint()
				.of(state.sourceVersion),
		})),
		observe: vi.fn(async () => "observed"),
	};
	const writes: ContentValue[] = [];
	const renderer: AssetContentRepository = {
		read: vi.fn(async (_file, _contract, registered) => ({
			revision: String(state.revision),
			locations: (registered ?? bindings)
				.filter((binding: ContentBinding) => state.content.has(binding.id))
				.map((binding: ContentBinding) => ({
					...binding,
					fingerprint: state.content.get(binding.id) as string,
				})),
		})),
		apply: vi.fn(async (_file, _snapshot, changes) => {
			for (const change of changes) {
				writes.push(change.value);
				state.content.set(
					change.location.id,
					change.value.type === "text"
						? change.value.fingerprint
						: new PublicationDomainComposition()
								.contentFingerprint()
								.of(`embedded:${change.value.fingerprint}`),
				);
			}
			state.revision++;
			if (state.failAfterApply) throw new Error("uncertain response");
			return String(state.revision);
		}),
	};
	const input = {
		folderId: "folder",
		fileId: "copy",
		templateId: "template",
		kind: "slides",
		mimeType,
		contract: fields,
		fresh: true,
		managed: true,
		model: { text: { [textKey]: "Public meetup" }, pictures: {} },
	};
	return { input, state, renderer, manifests, images, writes };
}

export function contentFixture(
	...args: Parameters<typeof contentDependencies>
) {
	const dependencies = contentDependencies(...args);
	return {
		...dependencies,
		service: new ReconcileAssetContent(
			{
				contentContractPolicy:
					new PublicationDomainComposition().contentContractPolicy(),
				contentRenderPlan:
					new PublicationDomainComposition().contentRenderPlan(),
				contentTextKey: new PublicationDomainComposition().contentTextKey(),
				contentManifestPolicy:
					new PublicationDomainComposition().contentManifestPolicy(),
				contentRecoveryFingerprint:
					new PublicationDomainComposition().contentRecoveryFingerprint(),
				contentRecoveryPlan:
					new PublicationDomainComposition().contentRecoveryPlan(),
				createResolveContentValues: (...args) =>
					new PublicationDomainComposition().resolveContentValues(
						{ value: (value) => value.value },
						...args,
					),
			},
			dependencies.manifests,
			{ [mimeType]: dependencies.renderer },
			dependencies.images,
		),
	};
}
