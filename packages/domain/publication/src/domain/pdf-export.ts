import type { PublicationDiagnostic } from "./model.js";

export interface PdfExportIdentity {
	readonly eventId: string;
	readonly folderId: string;
	readonly sourceId: string;
	readonly templateId: string;
}

export interface PdfExportSnapshot {
	readonly sourceVersion: string;
	readonly contract: "pdf-v1";
	readonly name: string;
	readonly fingerprint: string;
}

export interface PdfExportState {
	readonly identity: PdfExportIdentity;
	readonly fileId: string;
	readonly confirmed?: PdfExportSnapshot;
	readonly pending?: PdfExportSnapshot;
}

export interface PdfExportObservation {
	readonly id: string;
	readonly name: string;
	readonly fingerprint: string;
	readonly version: string;
}

export interface PdfExportBinary {
	readonly bytes: Uint8Array;
	readonly fingerprint: string;
}

export interface PdfExportResult {
	readonly status:
		| "not-applicable"
		| "pending"
		| "ready"
		| "conflict"
		| "recovery-required";
	readonly updated: boolean;
	readonly diagnostics: readonly PublicationDiagnostic[];
}
