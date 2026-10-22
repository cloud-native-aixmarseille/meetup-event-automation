import type {
	PdfExportIdentity,
	PdfExportObservation,
	PdfExportResult,
	PdfExportState,
} from "../domain/pdf-export.js";
import type { PdfExportFailure } from "../domain/pdf-export-error.js";
import { PdfExportError } from "../domain/pdf-export-error.js";
import type { PdfExportPolicy } from "../domain/pdf-export-policy.js";
import type {
	PdfExportRepository,
	PdfExportStateRepository,
	PresentationPdfSource,
} from "./pdf-export-ports.js";
import type { AssetContainer, AssetFile } from "./ports.js";

interface SlidePdfInput {
	readonly eligible: boolean;
	readonly sourceReady: boolean;
	readonly date: string;
	readonly container?: AssetContainer;
	readonly source?: AssetFile;
}

export class ReconcileSlidePdf {
	constructor(
		private readonly policy: Pick<
			PdfExportPolicy,
			"name" | "matches" | "current" | "recover"
		>,
		private readonly source: PresentationPdfSource,
		private readonly files: PdfExportRepository,
		private readonly states: PdfExportStateRepository,
	) {}

	async execute(input: SlidePdfInput): Promise<PdfExportResult> {
		if (!input.eligible)
			return { status: "not-applicable", updated: false, diagnostics: [] };
		if (!input.sourceReady) return this.failure("source-pending");
		if (!input.container || !input.source?.templateId)
			return this.failure("source");
		const identity = {
			eventId: input.container.eventId,
			folderId: input.container.id,
			sourceId: input.source.id,
			templateId: input.source.templateId,
		};
		try {
			return await this.reconcile(
				identity,
				this.policy.name(input.source.name, input.date),
			);
		} catch (error) {
			if (!(error instanceof PdfExportError)) throw error;
			return this.failure(error.code);
		}
	}

	private async reconcile(
		identity: PdfExportIdentity,
		name: string,
	): Promise<PdfExportResult> {
		const state = await this.states.load(identity);
		const observed = await this.files.find(identity, state?.fileId);
		const confirmed = this.policy.recover(state, observed);
		if (state?.pending && confirmed === state.pending) {
			await this.states.save({ identity, fileId: state.fileId, confirmed });
		}
		const sourceVersion = await this.source.observe(identity);
		if (observed && this.policy.current(confirmed, sourceVersion, name)) {
			if (state?.pending && confirmed !== state.pending)
				await this.states.save({ identity, fileId: state.fileId, confirmed });
			const updated = await this.files.placeInPublicFolder(identity, observed);
			return { status: "ready", updated, diagnostics: [] };
		}
		const binary = await this.source.export(identity);
		if ((await this.source.observe(identity)) !== sourceVersion)
			throw new PdfExportError("revision");
		const pending = {
			sourceVersion,
			contract: "pdf-v1" as const,
			name,
			fingerprint: binary.fingerprint,
		};
		const next: PdfExportState = {
			identity,
			fileId: state?.fileId ?? (await this.files.reserveId()),
			confirmed,
			pending,
		};
		await this.states.save(next);
		await this.files.write({
			identity,
			fileId: next.fileId,
			snapshot: pending,
			binary,
			previous: observed,
		});
		const uploaded = await this.confirm(
			next,
			await this.files.find(identity, next.fileId),
		);
		await this.files.placeInPublicFolder(identity, uploaded);
		return { status: "ready", updated: true, diagnostics: [] };
	}

	private async confirm(
		state: PdfExportState,
		observed: PdfExportObservation | undefined,
	): Promise<PdfExportObservation> {
		if (
			observed?.id !== state.fileId ||
			!this.policy.matches(state.pending, observed)
		) {
			throw new PdfExportError("invalid");
		}
		await this.states.save({
			identity: state.identity,
			fileId: state.fileId,
			confirmed: state.pending,
		});
		return observed;
	}

	private failure(code: PdfExportFailure): PdfExportResult {
		return {
			status:
				code === "conflict"
					? "conflict"
					: code === "recovery"
						? "recovery-required"
						: "pending",
			updated: false,
			diagnostics: [
				{
					code: `publication.assets.pdf.${code}`,
					field: "assets",
					severity: "warning",
					message: "The presentation PDF could not be reconciled",
					fixAvailable: false,
				},
			],
		};
	}
}

export type ReconcileSlidePdfArguments =
	ConstructorParameters<typeof ReconcileSlidePdf> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
