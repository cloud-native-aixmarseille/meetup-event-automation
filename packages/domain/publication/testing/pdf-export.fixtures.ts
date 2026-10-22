import { vi } from "vitest";
import type {
	PdfExportRepository,
	PdfExportStateRepository,
	PresentationPdfSource,
} from "../src/application/pdf-export-ports.js";
import type {
	PdfExportIdentity,
	PdfExportObservation,
	PdfExportSnapshot,
	PdfExportState,
} from "../src/domain/pdf-export.js";

export const pdfIdentity: PdfExportIdentity = {
	eventId: "example/meetups#42",
	folderId: "folder",
	sourceId: "slides",
	templateId: "template",
};
export const pdfSnapshot: PdfExportSnapshot = {
	sourceVersion: "1",
	contract: "pdf-v1",
	name: "2026-10-15 - Slides.pdf",
	fingerprint: "a".repeat(64),
};
export const pdfObservation: PdfExportObservation = {
	id: "pdf",
	name: pdfSnapshot.name,
	fingerprint: pdfSnapshot.fingerprint,
	version: "1",
};
export const pdfInput = {
	eligible: true,
	sourceReady: true,
	date: "2026-10-15",
	container: {
		id: "folder",
		eventId: pdfIdentity.eventId,
		name: "Event",
		url: "https://drive.google.com/drive/folders/folder",
	},
	source: { id: "slides", templateId: "template", name: "Slides" },
};
export const confirmedPdf: PdfExportState = {
	identity: pdfIdentity,
	fileId: "pdf",
	confirmed: pdfSnapshot,
};

export function pdfDependencies(
	initialState?: PdfExportState,
	initialFile?: PdfExportObservation,
) {
	let state = initialState;
	let file = initialFile;
	const operations: string[] = [];
	const source = {
		observe: vi.fn<PresentationPdfSource["observe"]>().mockResolvedValue("1"),
		export: vi.fn<PresentationPdfSource["export"]>().mockResolvedValue({
			bytes: new Uint8Array([1, 2, 3]),
			fingerprint: pdfSnapshot.fingerprint,
		}),
	};
	const files = {
		placeInPublicFolder: vi
			.fn<PdfExportRepository["placeInPublicFolder"]>()
			.mockResolvedValue(false),
		find: vi.fn<PdfExportRepository["find"]>(async () => file),
		reserveId: vi
			.fn<PdfExportRepository["reserveId"]>()
			.mockResolvedValue("pdf"),
		write: vi.fn<PdfExportRepository["write"]>(async (input) => {
			operations.push("upload");
			file = {
				id: input.fileId,
				name: input.snapshot.name,
				fingerprint: input.binary.fingerprint,
				version: "2",
			};
		}),
	};
	const states = {
		load: vi.fn<PdfExportStateRepository["load"]>(async () => state),
		save: vi.fn<PdfExportStateRepository["save"]>(async (next) => {
			operations.push(next.pending ? "pending" : "confirmed");
			state = next;
		}),
	};

	return {
		source,
		files,
		states,
		operations,
		getState: () => state,
		setFile: (next: PdfExportObservation | undefined) => {
			file = next;
		},
	};
}
