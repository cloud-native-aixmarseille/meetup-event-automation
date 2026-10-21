import type {
	ContentChange,
	ContentManifest,
	ContentRecovery,
	ContentSnapshot,
	ContentStatus,
	ContentValue,
	PublicAssetModel,
} from "../domain/asset-content.js";
import { ContentContractPolicy } from "../domain/content-contract-policy.js";
import { ContentError } from "../domain/content-error.js";
import { ContentManifestPolicy } from "../domain/content-manifest-policy.js";
import { ContentRecoveryFingerprint } from "../domain/content-recovery-fingerprint.js";
import { ContentRecoveryPlan } from "../domain/content-recovery-plan.js";
import { ContentRenderPlan } from "../domain/content-render-plan.js";
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
	contract?: unknown;
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
			const settled = ContentRenderPlan.settle(manifest, current, confirmed);
			const complete = !ContentRenderPlan.changes(settled, current, values)
				.length;
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
				? ContentRecoveryFingerprint.create(input.recovery)
				: undefined,
			pending: { revision: snapshot.revision, bindings },
		};
	}

	private async recover(
		input: ReconcileContentInput,
		original: ContentManifest,
		renderer: AssetContentRepository,
	) {
		const recovery = ContentRecoveryPlan.active(original, input.recovery);
		const prepared = ContentRecoveryPlan.beforeRead(original, recovery);
		const snapshot = await renderer.read(
			input.fileId,
			prepared.contract,
			prepared.bindings,
			prepared.initialRevision,
		);
		const manifest = ContentRecoveryPlan.settle(prepared, snapshot, recovery);
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
