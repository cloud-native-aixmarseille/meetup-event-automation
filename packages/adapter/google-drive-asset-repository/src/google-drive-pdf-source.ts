import type { Readable } from "node:stream";
import {
	PdfExportError,
	type PdfExportIdentity,
	type PresentationPdfSource,
} from "@meetup-automation/publication";
import type { DriveBoundedStream } from "./drive-bounded-stream.js";
import type { DrivePdfBinary } from "./drive-pdf-binary.js";
import type { DrivePdfLookup } from "./drive-pdf-lookup.js";
import type { DrivePdfMetadata } from "./drive-pdf-metadata.js";
import {
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";

export class GoogleDrivePdfSource implements PresentationPdfSource {
	constructor(
		private readonly client: GoogleDriveClient,
		private readonly lookup: Pick<DrivePdfLookup, "get">,
		private readonly metadata: Pick<
			DrivePdfMetadata,
			"source" | "validateIdentity"
		>,
		private readonly binary: Pick<DrivePdfBinary, "read">,
		private readonly stream: Pick<DriveBoundedStream, "read">,
	) {}

	async observe(identity: PdfExportIdentity): Promise<string> {
		this.metadata.validateIdentity(identity);
		const file = await this.lookup.get(identity.sourceId);
		if (!file) throw new PdfExportError("source");
		return this.metadata.source(file, identity);
	}

	async export(identity: PdfExportIdentity) {
		this.metadata.validateIdentity(identity);
		const response = await this.client.files.export(
			{ fileId: identity.sourceId, mimeType: "application/pdf" },
			{
				...requestOptions,
				responseType: "stream",
				signal: AbortSignal.timeout(30_000),
				// Read errors ourselves so the SDK cannot buffer an unbounded error body.
				validateStatus: () => true,
			},
		);
		if (response.status !== 200) await this.rejectResponse(response.data);
		return this.binary.read(response.data, response.headers["content-type"]);
	}

	private async rejectResponse(content: Readable): Promise<never> {
		let value: unknown;
		try {
			const bytes = await this.stream.read(content, 65_536);
			value = JSON.parse(bytes.toString("utf8"));
		} catch {
			throw new PdfExportError("invalid");
		}
		if (this.sizeFailure(value)) throw new PdfExportError("limit");
		throw new Error("Google Drive PDF export request failed");
	}

	private sizeFailure(value: unknown): boolean {
		if (!value || typeof value !== "object" || !("error" in value))
			return false;
		const details = value.error;
		if (
			!details ||
			typeof details !== "object" ||
			!("errors" in details) ||
			!Array.isArray(details.errors)
		)
			return false;
		return details.errors.some(
			(item) =>
				item &&
				typeof item === "object" &&
				item.reason === "exportSizeLimitExceeded",
		);
	}
}
