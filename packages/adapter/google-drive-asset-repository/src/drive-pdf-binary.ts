import type { Readable } from "node:stream";
import {
	type ContentFingerprint,
	type PdfExportBinary,
	PdfExportError,
} from "@meetup-automation/publication";
import type { DriveBoundedStream } from "./drive-bounded-stream.js";

export class DrivePdfBinary {
	constructor(
		private readonly stream: Pick<DriveBoundedStream, "read">,
		private readonly fingerprint: Pick<ContentFingerprint, "of">,
	) {}

	async read(content: Readable, mimeType: unknown): Promise<PdfExportBinary> {
		if (
			typeof mimeType !== "string" ||
			mimeType.split(";", 1)[0]?.trim().toLowerCase() !== "application/pdf"
		) {
			content.destroy();
			throw new PdfExportError("invalid");
		}
		const bytes = await this.stream.read(content, 10_000_000);
		if (
			!/^%PDF-\d\.\d\b/.test(bytes.subarray(0, 16).toString("ascii")) ||
			!/%%EOF\s*$/.test(bytes.subarray(-1024).toString("ascii"))
		) {
			throw new PdfExportError("invalid");
		}
		return { bytes, fingerprint: this.fingerprint.of(bytes) };
	}
}
