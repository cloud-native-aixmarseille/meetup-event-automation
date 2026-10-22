import type { PostEventPolicy } from "@meetup-automation/communication";
import {
	type EventClock,
	type EventDocument,
	type EventDocumentCodec,
	type EventDocumentConcurrency,
	type EventIdentity,
	EventNotFoundError,
	type EventRepository,
	type EventRepositoryPatches,
} from "@meetup-automation/event";
import type {
	ContentRecovery,
	ContentStatus,
	PdfExportResult,
	ReconcileEventAssets,
	ReconcileSlidePdf,
} from "@meetup-automation/publication";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { AssetRenderProjection } from "./asset-render-projection.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";
import type { ManageMeetupEventResult } from "./manage-meetup-event-contracts.js";

interface ManageMeetupAssetsDependencies {
	readonly clock: EventClock;
	readonly reconcilePdf: Pick<ReconcileSlidePdf, "execute">;
	readonly renderProjection?: Pick<AssetRenderProjection, "create">;
	readonly recovery?: Readonly<Record<string, ContentRecovery>>;
	readonly eventRepository: EventRepository;
	readonly documentCodec: EventDocumentCodec;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly reconcileAssets: Pick<ReconcileEventAssets, "execute">;
}

export interface ManageMeetupAssetsCollaborators {
	readonly postEventPolicy: Pick<PostEventPolicy, "isDue">;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"ensureEventDocumentIsCurrent"
	>;
	readonly eventRepositoryPatches: Pick<
		EventRepositoryPatches,
		"eventRepositoryPatchIsEmpty"
	>;
}

interface ManageMeetupAssetsResult {
	readonly pdf: PdfExportResult;
	readonly skipped: boolean;
	readonly persisted: boolean;
	readonly slidesReady: boolean;
	readonly assetUrl?: string;
	readonly files: Readonly<Record<string, string>>;
	readonly content?: Readonly<Record<string, ContentStatus>>;
	readonly diagnostics: readonly PublicDiagnostic[];
}

export class ManageMeetupAssets {
	constructor(
		private readonly collaborators: ManageMeetupAssetsCollaborators,
		private readonly dependencies: ManageMeetupAssetsDependencies,
	) {}

	async execute(input: {
		identity: EventIdentity;
	}): Promise<ManageMeetupAssetsResult> {
		const source = await this.dependencies.eventRepository.find(input.identity);
		if (!source) throw new EventNotFoundError(input.identity);
		const evaluation = await this.dependencies.manageEvent.execute({
			...input,
			mode: "check",
			sourceDocument: source,
		});
		if (evaluation.skipped || evaluation.event.occurrenceStatus === "cancelled")
			return this.skipped([]);
		if (
			!evaluation.event.host?.id ||
			evaluation.diagnostics.some(
				(item) =>
					item.severity === "error" &&
					(item.code.startsWith("referential.") ||
						/host|date/i.test(item.field ?? "")),
			)
		) {
			return this.skipped([
				{
					code: "publication.assets.prerequisites",
					severity: "warning",
					field: "publicationLinks.assets",
					message: "Resolve the event host and date before reconciling assets",
				},
			]);
		}
		await this.collaborators.eventDocumentConcurrency.ensureEventDocumentIsCurrent(
			this.dependencies.eventRepository,
			input.identity,
			source,
		);
		return this.reconcile(
			source,
			evaluation,
			evaluation.event.host.displayName,
		);
	}

	private async reconcile(
		source: EventDocument,
		evaluation: Extract<ManageMeetupEventResult, { skipped: false }>,
		hostName: string,
	): Promise<ManageMeetupAssetsResult> {
		const assets = await this.dependencies.reconcileAssets.execute({
			eventId: `${source.identity.repository}#${source.identity.issueNumber}`,
			date: evaluation.event.date,
			hostName,
			existingUrl: evaluation.event.publicationLinks.assets,
			mode: "fix",
			model: await this.dependencies.renderProjection?.create(
				evaluation.event,
				evaluation.diagnostics,
			),
			recovery: this.dependencies.recovery,
		});
		await this.collaborators.eventDocumentConcurrency.ensureEventDocumentIsCurrent(
			this.dependencies.eventRepository,
			source.identity,
			source,
		);
		const slidesReady =
			Boolean(assets.files["slides-link"]) &&
			["copy-only", "ready"].includes(assets.content?.slides ?? "copy-only");
		const pdf = await this.dependencies.reconcilePdf.execute({
			eligible: this.collaborators.postEventPolicy.isDue({
				eventDate: evaluation.event.date,
				timeZone: evaluation.event.timeZone,
				occurrenceStatus: evaluation.event.occurrenceStatus ?? "unknown",
				now: new Date(this.dependencies.clock.now()),
			}),
			sourceReady: slidesReady,
			date: evaluation.event.date,
			container: assets.container,
			source: assets.presentation,
		});
		const persisted = await this.persistAsset(source, assets.container?.url);
		return {
			skipped: false,
			persisted,
			slidesReady,
			pdf,
			assetUrl: assets.container?.url,
			files: assets.files,
			content: assets.content,
			diagnostics: [...assets.diagnostics, ...pdf.diagnostics].map((item) => ({
				...item,
				field: "publicationLinks.assets",
			})),
		};
	}

	private skipped(
		diagnostics: readonly PublicDiagnostic[],
	): ManageMeetupAssetsResult {
		return {
			pdf: { status: "not-applicable", updated: false, diagnostics: [] },
			skipped: true,
			persisted: false,
			slidesReady: false,
			files: {},
			diagnostics,
		};
	}

	private async persistAsset(
		source: EventDocument,
		assetUrl: string | undefined,
	) {
		let persisted = false;
		if (assetUrl) {
			// Only project the asset reference. Event normalization remains owned by
			// event reconciliation and the versioned codec owns all Markdown edits.
			const original = this.dependencies.documentCodec.decode(source).event;
			const patch = this.dependencies.documentCodec.createPatch(source, {
				...original,
				publicationLinks: {
					...original.publicationLinks,
					assets: assetUrl,
				},
			});
			if (
				!this.collaborators.eventRepositoryPatches.eventRepositoryPatchIsEmpty(
					patch,
				)
			) {
				await this.collaborators.eventDocumentConcurrency.ensureEventDocumentIsCurrent(
					this.dependencies.eventRepository,
					source.identity,
					source,
				);
				await this.dependencies.eventRepository.applyPatch(
					source.identity,
					patch,
				);
				persisted = true;
			}
		}

		return persisted;
	}
}
export type ManageMeetupAssetsArguments =
	ConstructorParameters<typeof ManageMeetupAssets> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
