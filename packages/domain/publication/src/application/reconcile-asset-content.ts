import type {
	ReconcileContentInput,
	ReconcileAssetContentCollaborators,
} from "./reconcile-asset-content-contracts.js";

import type {
	ContentChange,
	ContentContract,
	ContentRecovery,
	ContentManifest,
	ContentSnapshot,
	ContentStatus,
	ContentValue,
	PublicAssetModel,
	TemplateContentDefaults,
} from "../domain/asset-content.js";

import { ContentError } from "../domain/content-error.js";

import type {
	AssetContentRepository,
	AssetImageRepository,
	AssetManifestRepository,
} from "./content-ports.js";

import type { AssetFile, AssetTemplate } from "./ports.js";

export class ReconcileAssetContent {
	constructor(
		private readonly collaborators: ReconcileAssetContentCollaborators,
		private readonly manifests: AssetManifestRepository,
		private readonly renderers: Readonly<
			Record<string, AssetContentRepository>
		>,
		private readonly images: AssetImageRepository,
		private readonly defaults: TemplateContentDefaults,
	) {}

	async definition(
		folderId: string,
		template: AssetTemplate,
		file?: AssetFile,
		recovery?: ContentRecovery,
	): Promise<ContentContract | undefined> {
		return this.collaborators
			.createDiscoverAssetContent(this.manifests, this.renderers, this.defaults)
			.read(folderId, template, file, recovery);
	}

	async preflight(
		templateId: string,
		kind: string,
		mimeType: string,
		value: unknown,
		model: PublicAssetModel,
	): Promise<void> {
		const contract = this.collaborators.contentContractPolicy.parse(
			value,
			kind,
			mimeType,
		);
		await this.collaborators
			.createResolveContentValues(this.images)
			.execute(contract, model);
		this.collaborators.contentRenderPlan.initial(
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
			const values = await this.collaborators
				.createResolveContentValues(this.images)
				.execute(
					{
						...manifest.contract,
						fields: manifest.contract.fields.filter((field) =>
							recovered.manifest.bindings.some(
								(binding) =>
									binding.key ===
									(field.type === "text"
										? this.collaborators.contentTextKey.of(field)
										: field.slot),
							),
						),
					},
					input.model,
				);
			const changes = this.collaborators.contentRenderPlan.changes(
				manifest,
				snapshot,
				values,
			);
			if (!changes.length)
				return {
					status: "ready",
					fallback: values.some((value) => value.fallback),
				};
			manifest = this.collaborators.contentRenderPlan.pending(
				manifest,
				snapshot,
				changes,
			);
			await this.manifests.save(input.folderId, manifest);
			const written = await this.write(
				input,
				renderer,
				manifest,
				snapshot,
				changes,
				values,
				attempt === 0,
			);
			manifest = written.manifest;
			if (written.complete)
				return {
					status: "ready",
					fallback: values.some((value) => value.fallback),
				};
		}
		return { status: "pending", fallback: false };
	}

	private async write(
		input: ReconcileContentInput,
		renderer: AssetContentRepository,
		manifest: ContentManifest,
		snapshot: ContentSnapshot,
		changes: readonly ContentChange[],
		values: readonly ContentValue[],
		retry: boolean,
	): Promise<{ manifest: ContentManifest; complete: boolean }> {
		let confirmed = false;
		let failure: { error: unknown } | undefined;
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
				const retriable = { ...manifest, pending: undefined };
				await this.manifests.save(input.folderId, retriable);
				return { manifest: retriable, complete: false };
			}
			failure = { error };
			current = await renderer.read(
				input.fileId,
				manifest.contract,
				manifest.bindings,
				manifest.pending?.revision,
			);
		}
		try {
			const settled = this.collaborators.contentRenderPlan.settle(
				manifest,
				current,
				confirmed,
			);
			const complete = !this.collaborators.contentRenderPlan.changes(
				settled,
				current,
				values,
			).length;
			if (failure && !complete) {
				if (retry) return { manifest: settled, complete };
				throw failure.error;
			}
			await this.manifests.save(input.folderId, settled);
			return { manifest: settled, complete };
		} catch (error) {
			// Keep the saved pending write for recovery and preserve technical faults.
			throw failure ? failure.error : error;
		}
	}

	private async load(
		input: ReconcileContentInput,
		renderer: AssetContentRepository,
	): Promise<ContentManifest | undefined> {
		const stored = await this.manifests.load(input.folderId, input.fileId);
		if (stored !== undefined)
			return this.collaborators.contentManifestPolicy.parse(
				stored,
				input.fileId,
				input.templateId,
				input.mimeType,
			);
		if (!input.fresh && input.recovery?.operation !== "enroll") {
			if (input.managed) throw new ContentError("recovery");
			return undefined;
		}
		const contract = this.collaborators.contentContractPolicy.parse(
			input.contract,
			input.kind,
			input.mimeType,
		);
		const snapshot = await renderer.read(input.fileId, contract);
		if (input.recovery && snapshot.revision !== input.recovery.revision)
			throw new ContentError("revision");
		const bindings = this.collaborators.contentRenderPlan.initial(snapshot);
		return {
			version: 1,
			fileId: input.fileId,
			templateId: input.templateId,
			mimeType: input.mimeType,
			contract,
			bindings,
			initialRevision: snapshot.revision,
			recoveryId: input.recovery
				? this.collaborators.contentRecoveryFingerprint.create(input.recovery)
				: undefined,
			pending: { revision: snapshot.revision, bindings },
		};
	}

	private async recover(
		input: ReconcileContentInput,
		original: ContentManifest,
		renderer: AssetContentRepository,
	) {
		const recovery = this.collaborators.contentRecoveryPlan.active(
			original,
			input.recovery,
		);
		const prepared = this.collaborators.contentRecoveryPlan.beforeRead(
			original,
			recovery,
		);
		const snapshot = await renderer.read(
			input.fileId,
			prepared.contract,
			prepared.bindings,
			prepared.initialRevision,
		);
		const manifest = this.collaborators.contentRecoveryPlan.settle(
			prepared,
			snapshot,
			recovery,
		);
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
export type ReconcileAssetContentArguments =
	ConstructorParameters<typeof ReconcileAssetContent> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
