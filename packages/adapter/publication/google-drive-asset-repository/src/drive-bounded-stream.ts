import type { Readable } from "node:stream";
import { PdfExportError } from "@meetup-automation/publication";

/** Bounds downloaded export media before it can enter application memory. */
export class DriveBoundedStream {
	async read(stream: Readable, limit: number): Promise<Buffer> {
		const chunks: Buffer[] = [];
		let size = 0;
		try {
			for await (const chunk of stream) {
				if (!(chunk instanceof Uint8Array)) throw new PdfExportError("invalid");
				size += chunk.byteLength;
				if (size > limit) throw new PdfExportError("limit");
				chunks.push(Buffer.from(chunk));
			}
			return Buffer.concat(chunks);
		} finally {
			stream.destroy();
		}
	}
}
