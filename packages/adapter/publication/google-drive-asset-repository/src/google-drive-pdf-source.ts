import {
	PdfExportError,
	type PdfExportIdentity,
	type PresentationPdfSource,
} from "@meetup-automation/publication";
import type { DrivePdfLookup } from "./drive-pdf-lookup.js";
import type { DrivePdfMetadata } from "./drive-pdf-metadata.js";
import type { GoogleDrivePdfDownload } from "./google-drive-pdf-download.js";

export class GoogleDrivePdfSource implements PresentationPdfSource {
	constructor(
		private readonly lookup: Pick<DrivePdfLookup, "get">,
		private readonly metadata: Pick<
			DrivePdfMetadata,
			"source" | "validateIdentity"
		>,
		private readonly download: Pick<GoogleDrivePdfDownload, "export">,
	) {}

	async observe(identity: PdfExportIdentity): Promise<string> {
		this.metadata.validateIdentity(identity);
		const file = await this.lookup.get(identity.sourceId);
		if (!file) throw new PdfExportError("source");
		return this.metadata.source(file, identity);
	}

	async export(identity: PdfExportIdentity) {
		this.metadata.validateIdentity(identity);
		return this.download.export(identity.sourceId);
	}
}
