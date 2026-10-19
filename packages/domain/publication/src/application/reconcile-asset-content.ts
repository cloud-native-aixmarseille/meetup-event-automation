import type {
	ContentContract,
	ContentManifest,
	ContentRecovery,
	ContentSnapshot,
	ContentStatus,
	PublicAssetModel,
} from "../domain/asset-content.js";
import { ContentContractPolicy } from "../domain/content-contract-policy.js";
import { ContentManifestPolicy } from "../domain/content-manifest-policy.js";
import { ContentRenderPlan } from "../domain/content-render-plan.js";
import { ContentFingerprint } from "../domain/content-fingerprint.js";
import { ContentError } from "../domain/content-error.js";
import { ContentTextKey } from "../domain/content-text-key.js";
import type {
	AssetContentRepository,
	AssetImageRepository,
	AssetManifestRepository,
} from "./content-ports.js";
import { ResolveContentValues } from "./resolve-content-values.js";

export type ReconcileContentInput = Readonly<{
	folderId: string;
	fileId: string;
	templateId: string;
	kind: string;
	mimeType: string;
	contract?: ContentContract;
	fresh?: boolean;
	model: PublicAssetModel;
	recovery?: ContentRecovery;
	managed?: boolean;
}>;

export class ReconcileAssetContent {
	constructor(
		private readonly manifests: AssetManifestRepository,
		private readonly renderers: Readonly<
			Record<string, AssetContentRepository>
		>,
		private readonly images: AssetImageRepository,
	) {}

	async preflight(
		templateId: string,
		kind: string,
		mimeType: string,
		value: unknown,
		model: PublicAssetModel,
	): Promise<void> {
		const contract = ContentContractPolicy.parse(value, kind, mimeType);
		await new ResolveContentValues(this.images).execute(contract, model);
		ContentRenderPlan.initial(
			await this.renderer(mimeType).read(templateId, contract),
		);
	}

	async execute(
		input: ReconcileContentInput,
	): Promise<{ status: ContentStatus; fallback: boolean }> {
		const renderer = this.renderer(input.mimeType);
		let manifest = await this.load(input, renderer);
		if (!manifest) return { status: "copy-only", fallback: false };
		for (let attempt = 0; attempt < 2; attempt++) {
			const recovered = await this.recover(input, manifest, renderer);
			manifest = recovered.manifest;
			const snapshot = recovered.snapshot;
			const values = await new ResolveContentValues(this.images).execute(
				{
					...manifest.contract,
					fields: manifest.contract.fields.filter((field) =>
						recovered.manifest.bindings.some(
							(binding) =>
								binding.key ===
								(field.type === "text" ? ContentTextKey.of(field) : field.slot),
						),
					),
				},
				input.model,
			);
			const changes = ContentRenderPlan.changes(manifest, snapshot, values);
			if (!changes.length)
				return {
					status: "ready",
					fallback: values.some((value) => value.fallback),
				};
			manifest = ContentRenderPlan.pending(manifest, snapshot, changes);
			await this.manifests.save(input.folderId, manifest);
			let confirmed = false;
			let current: ContentSnapshot;
			try {
				const revision = await renderer.apply(input.fileId, snapshot, changes);
				current = await renderer.read(
					input.fileId,
					manifest.contract,
					manifest.bindings,
				);
				confirmed = current.revision === revision;
			} catch (error) {
				if (error instanceof ContentError && error.code === "revision") {
					manifest = { ...manifest, pending: undefined };
					await this.manifests.save(input.folderId, manifest);
					continue;
				}
				current = await renderer.read(
					input.fileId,
					manifest.contract,
					manifest.bindings,
					manifest.pending?.revision,
				);
			}
			manifest = ContentRenderPlan.settle(manifest, current, confirmed);
			await this.manifests.save(input.folderId, manifest);
			if (!ContentRenderPlan.changes(manifest, current, values).length)
				return {
					status: "ready",
					fallback: values.some((value) => value.fallback),
				};
		}
		return { status: "pending", fallback: false };
	}

	private async load(
		input: ReconcileContentInput,
		renderer: AssetContentRepository,
	): Promise<ContentManifest | undefined> {
		const stored = await this.manifests.load(input.folderId, input.fileId);
		if (stored !== undefined)
			return ContentManifestPolicy.parse(
				stored,
				input.fileId,
				input.templateId,
				input.mimeType,
			);
		if (!input.fresh && input.recovery?.operation !== "enroll") {
			if (input.managed) throw new ContentError("recovery");
			return undefined;
		}
		const contract = ContentContractPolicy.parse(
			input.contract,
			input.kind,
			input.mimeType,
		);
		const snapshot = await renderer.read(input.fileId, contract);
		if (input.recovery && snapshot.revision !== input.recovery.revision)
			throw new ContentError("revision");
		const bindings = ContentRenderPlan.initial(snapshot);
		return {
			version: 1,
			fileId: input.fileId,
			templateId: input.templateId,
			mimeType: input.mimeType,
			contract,
			bindings,
			initialRevision: snapshot.revision,
			recoveryId: input.recovery
				? ContentFingerprint.of(JSON.stringify(input.recovery))
				: undefined,
			pending: { revision: snapshot.revision, bindings },
		};
	}

	private async recover(
		input: ReconcileContentInput,
		original: ContentManifest,
		renderer: AssetContentRepository,
	) {
		const recovery =
			input.recovery &&
			ContentFingerprint.of(JSON.stringify(input.recovery)) ===
				original.recoveryId
				? undefined
				: input.recovery;
		let manifest = original;
		if (recovery?.operation === "remove") {
			manifest = {
				...manifest,
				pending: undefined,
				bindings: manifest.bindings.filter(
					(binding) => binding.id !== recovery.bindingId,
				),
			};
		}
		const snapshot = await renderer.read(
			input.fileId,
			manifest.contract,
			manifest.bindings,
			manifest.initialRevision,
		);
		if (recovery && snapshot.revision !== recovery.revision)
			throw new ContentError("revision");
		if (recovery?.operation === "restore") {
			if (
				!manifest.bindings.some((binding) => binding.id === recovery.bindingId)
			)
				throw new ContentError("recovery");
			manifest = {
				...manifest,
				pending: undefined,
				bindings: manifest.bindings.map((binding) =>
					binding.id === recovery.bindingId
						? {
								...binding,
								applied: snapshot.locations.find(
									(item) => item.id === binding.id,
								)?.fingerprint as string,
								desired: undefined,
							}
						: binding,
				),
			};
		}
		if (manifest.pending)
			manifest = ContentRenderPlan.settle(manifest, snapshot, false);
		if (recovery)
			manifest = {
				...manifest,
				recoveryId: ContentFingerprint.of(JSON.stringify(recovery)),
			};
		if (manifest !== original)
			await this.manifests.save(input.folderId, manifest);
		return { manifest, snapshot };
	}

	private renderer(mimeType: string): AssetContentRepository {
		const renderer = this.renderers[mimeType];
		if (!renderer) throw new ContentError("contract");
		return renderer;
	}
}
