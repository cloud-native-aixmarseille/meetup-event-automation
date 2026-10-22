import type {
	PdfExportIdentity,
	PdfExportObservation,
	PdfExportSnapshot,
	PdfExportState,
} from "./pdf-export.js";
import { PdfExportError } from "./pdf-export-error.js";

/** Owns snapshot equality and evidence required to recover an interrupted export. */
export class PdfExportPolicy {
	name(sourceName: string, date: string): string {
		const clipped = sourceName.slice(0, 187);
		const title = clipped.includes(date) ? clipped : `${date} - ${clipped}`;
		return `${title.slice(0, 200)}.pdf`;
	}

	matches(
		snapshot: PdfExportSnapshot | undefined,
		observed: PdfExportObservation | undefined,
	): boolean {
		return Boolean(
			snapshot &&
				observed &&
				snapshot.name === observed.name &&
				snapshot.fingerprint === observed.fingerprint,
		);
	}

	current(
		snapshot: PdfExportSnapshot | undefined,
		sourceVersion: string,
		name: string,
	): boolean {
		return (
			snapshot?.contract === "pdf-v1" &&
			snapshot.sourceVersion === sourceVersion &&
			snapshot.name === name
		);
	}

	sameIdentity(left: PdfExportIdentity, right: PdfExportIdentity): boolean {
		return (
			left.eventId === right.eventId &&
			left.folderId === right.folderId &&
			left.sourceId === right.sourceId &&
			left.templateId === right.templateId
		);
	}

	recover(
		state: PdfExportState | undefined,
		observed: PdfExportObservation | undefined,
	): PdfExportSnapshot | undefined {
		if (!state) {
			if (observed) throw new PdfExportError("recovery");
			return undefined;
		}
		if (observed && observed.id !== state.fileId)
			throw new PdfExportError("recovery");
		if (state.pending && this.matches(state.pending, observed))
			return state.pending;
		if (state.confirmed && this.matches(state.confirmed, observed))
			return state.confirmed;
		if (state.confirmed || observed) throw new PdfExportError("conflict");
		return undefined;
	}
}
