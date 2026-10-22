import {
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
	ReconcileEventAssets,
} from "@meetup-automation/publication";
import type { EventDocumentRevision } from "../ports/event-document-revision.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { AssetRenderProjection } from "./asset-render-projection.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";
import type { ManageMeetupEventResult } from "./manage-meetup-event-contracts.js";
import type { SlidesPdfSource } from "./reconcile-meetup-slides-pdf.js";

interface ReconcileMeetupDocumentsDependencies {
	readonly revision: EventDocumentRevision;
	readonly renderProjection?: Pick<AssetRenderProjection, "create">;
	readonly recovery?: Readonly<Record<string, ContentRecovery>>;
	readonly eventRepository: EventRepository;
	readonly documentCodec: EventDocumentCodec;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly reconcileAssets: Pick<ReconcileEventAssets, "execute">;
}

export interface ReconcileMeetupDocumentsCollaborators {
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"ensureEventDocumentIsCurrent"
	>;
	readonly eventRepositoryPatches: Pick<
		EventRepositoryPatches,
		"eventRepositoryPatchIsEmpty"
	>;
}

interface ReconcileMeetupDocumentsResult {
	readonly pdfSource: SlidesPdfSource;
	readonly skipped: boolean;
	readonly persisted: boolean;
	readonly slidesReady: boolean;
	readonly assetUrl?: string;
	readonly files: Readonly<Record<string, string>>;
	readonly content?: Readonly<Record<string, ContentStatus>>;
	readonly diagnostics: readonly PublicDiagnostic[];
}

export class ReconcileMeetupDocuments {
	constructor(
		private readonly collaborators: ReconcileMeetupDocumentsCollaborators,
		private readonly dependencies: ReconcileMeetupDocumentsDependencies,
	) {}

	async execute(input: {
		identity: EventIdentity;
	}): Promise<ReconcileMeetupDocumentsResult> {
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
	): Promise<ReconcileMeetupDocumentsResult> {
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
		const { persisted, current } = await this.persistAsset(
			source,
			assets.container?.url,
		);
		return {
			skipped: false,
			persisted,
			slidesReady,
			pdfSource: {
				container: assets.container,
				presentation: assets.presentation,
				revision: this.dependencies.revision.of(current),
			},
			assetUrl: assets.container?.url,
			files: assets.files,
			content: assets.content,
			diagnostics: assets.diagnostics.map((item) => ({
				...item,
				field: "publicationLinks.assets",
			})),
		};
	}

	private skipped(
		diagnostics: readonly PublicDiagnostic[],
	): ReconcileMeetupDocumentsResult {
		return {
			pdfSource: {},
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
		let current = source;
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
				current = { ...source, ...patch };
			}
		}

		return { persisted, current };
	}
}
export type ReconcileMeetupDocumentsArguments =
	ConstructorParameters<typeof ReconcileMeetupDocuments> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
