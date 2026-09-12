import {
	type EventDocumentCodec,
	type EventIdentity,
	EventNotFoundError,
	type EventRepository,
	ensureEventDocumentIsCurrent,
	eventRepositoryPatchIsEmpty,
} from "@meetup-automation/event";
import type { ReconcileEventAssets } from "@meetup-automation/publication";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";

interface ManageMeetupAssetsDependencies {
	readonly eventRepository: EventRepository;
	readonly documentCodec: EventDocumentCodec;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly reconcileAssets: Pick<ReconcileEventAssets, "execute">;
}

export class ManageMeetupAssets {
	constructor(private readonly dependencies: ManageMeetupAssetsDependencies) {}

	async execute(input: {
		identity: EventIdentity;
		mode: "check" | "fix";
	}): Promise<{
		skipped: boolean;
		persisted: boolean;
		assetUrl?: string;
		files: Readonly<Record<string, string>>;
		diagnostics: readonly PublicDiagnostic[];
	}> {
		const source = await this.dependencies.eventRepository.find(input.identity);
		if (!source) throw new EventNotFoundError(input.identity);
		const evaluation = await this.dependencies.manageEvent.execute({
			...input,
			mode: "check",
			sourceDocument: source,
		});
		if (evaluation.skipped || evaluation.event.occurrenceStatus === "cancelled")
			return { skipped: true, persisted: false, files: {}, diagnostics: [] };
		if (
			!evaluation.event.host?.id ||
			evaluation.diagnostics.some(
				(item) =>
					item.severity === "error" &&
					(item.code.startsWith("referential.") ||
						/host|date/i.test(item.field ?? "")),
			)
		) {
			return {
				skipped: true,
				persisted: false,
				files: {},
				diagnostics: [
					{
						code: "publication.assets.prerequisites",
						severity: "warning",
						field: "publicationLinks.assets",
						message:
							"Resolve the event host and date before reconciling assets",
					},
				],
			};
		}
		if (input.mode === "fix")
			await ensureEventDocumentIsCurrent(
				this.dependencies.eventRepository,
				input.identity,
				source,
			);
		const assets = await this.dependencies.reconcileAssets.execute({
			eventId: `${input.identity.repository}#${input.identity.issueNumber}`,
			date: evaluation.event.date,
			hostName: evaluation.event.host.displayName,
			existingUrl: evaluation.event.publicationLinks.assets,
			mode: input.mode,
		});
		let persisted = false;
		if (input.mode === "fix" && assets.container) {
			// Only project the asset reference. Event normalization remains owned by
			// event reconciliation and the versioned codec owns all Markdown edits.
			const original = this.dependencies.documentCodec.decode(source).event;
			const patch = this.dependencies.documentCodec.createPatch(source, {
				...original,
				publicationLinks: {
					...original.publicationLinks,
					assets: assets.container.url,
				},
			});
			if (!eventRepositoryPatchIsEmpty(patch)) {
				await ensureEventDocumentIsCurrent(
					this.dependencies.eventRepository,
					input.identity,
					source,
				);
				await this.dependencies.eventRepository.applyPatch(
					input.identity,
					patch,
				);
				persisted = true;
			}
		}
		return {
			skipped: false,
			persisted,
			assetUrl: assets.container?.url,
			files: assets.files,
			diagnostics: assets.diagnostics.map((item) => ({
				...item,
				field: "publicationLinks.assets",
			})),
		};
	}
}
