import { Readable } from "node:stream";
import { ContentFingerprint } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { pdfBytes, pdfFingerprint } from "../testing/pdf-drive.fixtures.js";
import { DriveBoundedStream } from "./drive-bounded-stream.js";
import { DrivePdfBinary } from "./drive-pdf-binary.js";

describe("DrivePdfBinary", () => {
	it("validates and fingerprints the complete exported byte stream", async () => {
		// Arrange
		const reader = new DrivePdfBinary(
			new DriveBoundedStream(),
			new ContentFingerprint(),
		);
		const stream = Readable.from([pdfBytes]);

		// Act
		const result = await reader.read(stream, "application/pdf; charset=binary");

		// Assert
		expect(result).toEqual({ bytes: pdfBytes, fingerprint: pdfFingerprint });
	});

	it.each([
		["text/html", pdfBytes],
		[undefined, pdfBytes],
		["application/pdf", Buffer.from("<html>not a PDF</html>")],
		["application/pdf", pdfBytes.subarray(0, -7)],
	])("rejects invalid exported media %#", async (mimeType, bytes) => {
		// Arrange
		const reader = new DrivePdfBinary(
			new DriveBoundedStream(),
			new ContentFingerprint(),
		);
		const stream = Readable.from([bytes]);

		// Act
		const operation = reader.read(stream, mimeType);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "invalid" });
		expect(stream.destroyed).toBe(true);
	});

	it("enforces the export byte limit", async () => {
		// Arrange
		const reader = new DrivePdfBinary(
			new DriveBoundedStream(),
			new ContentFingerprint(),
		);
		const stream = Readable.from([Buffer.alloc(50_000_001)]);

		// Act
		const operation = reader.read(stream, "application/pdf");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "limit" });
	});
});
