import type {
	PdfExportBinary,
	PdfExportIdentity,
	PdfExportObservation,
	PdfExportSnapshot,
	PdfExportState,
} from "../domain/pdf-export.js";

export interface PresentationPdfSource {
	observe(identity: PdfExportIdentity): Promise<string>;
	export(identity: PdfExportIdentity): Promise<PdfExportBinary>;
}

export interface PdfExportRepository {
	find(
		identity: PdfExportIdentity,
		expectedId?: string,
	): Promise<PdfExportObservation | undefined>;
	reserveId(): Promise<string>;
	placeInPublicFolder(
		identity: PdfExportIdentity,
		expected: PdfExportObservation,
	): Promise<boolean>;
	write(input: {
		identity: PdfExportIdentity;
		fileId: string;
		snapshot: PdfExportSnapshot;
		binary: PdfExportBinary;
		previous?: PdfExportObservation;
	}): Promise<void>;
}

export interface PdfExportStateRepository {
	load(identity: PdfExportIdentity): Promise<PdfExportState | undefined>;
	save(state: PdfExportState): Promise<void>;
}
