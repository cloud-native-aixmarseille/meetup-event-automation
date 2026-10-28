import { describe, expect, it } from "vitest";
import {
	createPdfDrive,
	exportIdentity,
	pdfBytes,
	pdfFingerprint,
} from "../testing/pdf-drive.fixtures.js";
import { GoogleDrivePdfComposition } from "./pdf-export-composition.js";

describe("GoogleDrivePdfSource", () => {
	it("observes source versions and downloads the managed presentation", async () => {
		// Arrange
		const drive = createPdfDrive();
		const source = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
			drive.download,
		).source();

		// Act
		const version = await source.observe(exportIdentity);
		const result = await source.export(exportIdentity);

		// Assert
		expect(version).toBe("1");
		expect(result).toEqual({ bytes: pdfBytes, fingerprint: pdfFingerprint });
		expect(drive.download.export).toHaveBeenCalledWith(exportIdentity.sourceId);
		expect(drive.files.create).not.toHaveBeenCalled();
	});

	it("reports a missing source as an organizer correction", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.delete(exportIdentity.sourceId);
		const source = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
			drive.download,
		).source();

		// Act
		const result = source.observe(exportIdentity);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "source" });
	});

	it("rejects invalid identities before downloading", async () => {
		// Arrange
		const drive = createPdfDrive();
		const source = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
			drive.download,
		).source();

		// Act
		const result = source.export({ ...exportIdentity, sourceId: "../invalid" });

		// Assert
		await expect(result).rejects.toMatchObject({ code: "recovery" });
		expect(drive.download.export).not.toHaveBeenCalled();
	});
});
