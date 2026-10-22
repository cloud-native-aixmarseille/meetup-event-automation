import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import {
	createPdfDrive,
	exportIdentity,
	pdfBytes,
	pdfFingerprint,
} from "../testing/pdf-drive.fixtures.js";
import { GoogleDrivePdfSource } from "./google-drive-pdf-source.js";
import { GoogleDrivePdfComposition } from "./pdf-export-composition.js";

describe("GoogleDrivePdfSource", () => {
	it.each([
		Buffer.from(
			JSON.stringify({
				error: { errors: [{ reason: "insufficientPermissions" }] },
			}),
		),
		Buffer.alloc(65_537),
		Buffer.from("invalid provider response"),
	])(
		"rejects bounded provider failures as technical errors %#",
		async (bytes) => {
			// Arrange
			const drive = createPdfDrive();
			drive.files.export.mockResolvedValue({
				status: 403,
				data: Readable.from([bytes]),
				headers: { "content-type": "application/json" },
			});
			const adapter = new GoogleDrivePdfComposition(
				drive.client,
				"public-folder",
			);
			const source = new GoogleDrivePdfSource(
				drive.client,
				adapter.lookup(),
				adapter.metadata(),
				adapter.binary(),
				adapter.stream(),
			);

			// Act
			const result = source.export(exportIdentity);

			// Assert
			await expect(result).rejects.toBeInstanceOf(Error);
		},
	);
	it("observes source versions and exports bounded PDF bytes", async () => {
		// Arrange
		const drive = createPdfDrive();
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const source = new GoogleDrivePdfSource(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.stream(),
		);

		// Act
		const version = await source.observe(exportIdentity);
		const result = await source.export(exportIdentity);

		// Assert
		expect(version).toBe("1");
		expect(result).toEqual({ bytes: pdfBytes, fingerprint: pdfFingerprint });
		expect(drive.files.export).toHaveBeenCalledWith(
			{ fileId: exportIdentity.sourceId, mimeType: "application/pdf" },
			expect.objectContaining({
				retry: false,
				timeout: 30_000,
				responseType: "stream",
				signal: expect.any(AbortSignal),
			}),
		);
		expect(drive.files.create).not.toHaveBeenCalled();
	});

	it("reports a missing source as an organizer correction", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.delete(exportIdentity.sourceId);
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const source = new GoogleDrivePdfSource(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.stream(),
		);

		// Act
		const operation = source.observe(exportIdentity);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "source" });
	});

	it("recognizes the provider export-size failure", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.files.export.mockResolvedValue({
			status: 403,
			data: Readable.from([
				Buffer.from(
					JSON.stringify({
						error: { errors: [{ reason: "exportSizeLimitExceeded" }] },
					}),
				),
			]),
			headers: { "content-type": "application/json" },
		});
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const source = new GoogleDrivePdfSource(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.stream(),
		);

		// Act
		const operation = source.export(exportIdentity);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "limit" });
	});

	it.each([
		new Error("network unavailable"),
		{
			response: {
				status: 403,
				data: { error: { errors: [{ reason: "insufficientPermissions" }] } },
			},
		},
	])(
		"preserves unexpected failures as technical errors %#",
		async (failure) => {
			// Arrange
			const drive = createPdfDrive();
			drive.files.export.mockRejectedValue(failure);
			const adapter = new GoogleDrivePdfComposition(
				drive.client,
				"public-folder",
			);
			const source = new GoogleDrivePdfSource(
				drive.client,
				adapter.lookup(),
				adapter.metadata(),
				adapter.binary(),
				adapter.stream(),
			);

			// Act
			const operation = source.export(exportIdentity);

			// Assert
			await expect(operation).rejects.toBe(failure);
		},
	);
});
