export type PdfExportFailure =
	| "source"
	| "source-pending"
	| "revision"
	| "conflict"
	| "recovery"
	| "limit"
	| "invalid";

export class PdfExportError extends Error {
	constructor(readonly code: PdfExportFailure) {
		super(`PDF export could not complete: ${code}`);
		this.name = "PdfExportError";
	}
}
