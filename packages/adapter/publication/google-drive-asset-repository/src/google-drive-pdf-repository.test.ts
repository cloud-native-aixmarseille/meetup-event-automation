import { describe, expect, it } from "vitest";
import {
	createPdfDrive,
	exportIdentity,
	exportSnapshot,
	pdfBytes,
	pdfFingerprint,
	pdfMetadata,
} from "../testing/pdf-drive.fixtures.js";
import { GoogleDrivePdfRepository } from "./google-drive-pdf-repository.js";
import { GoogleDrivePdfComposition } from "./pdf-export-composition.js";

describe("GoogleDrivePdfRepository", () => {
	it("refuses to move content edited after verification", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: pdfBytes,
		});
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const repository = new GoogleDrivePdfRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.folders(),
			adapter.sharing(),
		);
		const expected = await repository.find(exportIdentity, "reserved-pdf");
		if (!expected) throw new Error("Synthetic PDF missing");
		drive.records.set("reserved-pdf", {
			metadata: { ...pdfMetadata("pdf"), version: "2" },
			bytes: pdfBytes,
		});

		// Act
		const operation = repository.placeInPublicFolder(exportIdentity, expected);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "conflict" });
		expect(drive.files.update).not.toHaveBeenCalled();
		expect(drive.records.get("reserved-pdf")?.metadata.parents).toEqual([
			exportIdentity.folderId,
		]);
	});

	it("requires a verified move before reporting success", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: pdfBytes,
		});
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const repository = new GoogleDrivePdfRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.folders(),
			adapter.sharing(),
		);
		const expected = await repository.find(exportIdentity, "reserved-pdf");
		if (!expected) throw new Error("Synthetic PDF missing");
		drive.files.update.mockResolvedValue({ data: pdfMetadata("pdf") });

		// Act
		const operation = repository.placeInPublicFolder(exportIdentity, expected);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "invalid" });
	});

	it("creates a binary PDF with a reserved ID and independent metadata", async () => {
		// Arrange
		const drive = createPdfDrive();
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const repository = new GoogleDrivePdfRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.folders(),
			adapter.sharing(),
		);

		// Act
		const id = await repository.reserveId();
		await repository.write({
			identity: exportIdentity,
			fileId: id,
			snapshot: exportSnapshot,
			binary: { bytes: pdfBytes, fingerprint: pdfFingerprint },
		});
		const observed = await repository.find(exportIdentity, id);

		// Assert
		expect(observed).toMatchObject({
			id: "reserved-pdf",
			name: exportSnapshot.name,
			fingerprint: pdfFingerprint,
		});
		expect(drive.files.create).toHaveBeenCalledWith(
			expect.objectContaining({
				supportsAllDrives: true,
				requestBody: expect.objectContaining({
					id,
					parents: [exportIdentity.folderId],
					mimeType: "application/pdf",
					description: exportIdentity.eventId,
				}),
			}),
			{ retry: false, timeout: 30_000 },
		);
		expect(drive.records.get(id)?.metadata.appProperties).not.toHaveProperty(
			"template_file_id",
		);
	});

	it("updates the verified existing PDF without creating another file", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: pdfBytes,
		});
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const repository = new GoogleDrivePdfRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.folders(),
			adapter.sharing(),
		);
		const previous = await repository.find(exportIdentity, "reserved-pdf");

		// Act
		await repository.write({
			identity: exportIdentity,
			fileId: "reserved-pdf",
			snapshot: exportSnapshot,
			binary: { bytes: pdfBytes, fingerprint: pdfFingerprint },
			previous,
		});

		// Assert
		expect(drive.files.update).toHaveBeenCalledOnce();
		expect(drive.files.create).not.toHaveBeenCalled();
	});

	it("detects a human edit made before the upload", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: pdfBytes,
		});
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const repository = new GoogleDrivePdfRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.folders(),
			adapter.sharing(),
		);
		const previous = await repository.find(exportIdentity, "reserved-pdf");
		drive.records.set("reserved-pdf", {
			metadata: { ...pdfMetadata("pdf"), version: "2" },
			bytes: pdfBytes,
		});

		// Act
		const operation = repository.write({
			identity: exportIdentity,
			fileId: "reserved-pdf",
			snapshot: exportSnapshot,
			binary: { bytes: pdfBytes, fingerprint: pdfFingerprint },
			previous,
		});

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "conflict" });
		expect(drive.files.update).not.toHaveBeenCalled();
	});

	it("treats invalid managed PDF bytes as a conflict", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: Buffer.from("manual replacement"),
		});
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const repository = new GoogleDrivePdfRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.folders(),
			adapter.sharing(),
		);

		// Act
		const operation = repository.find(exportIdentity, "reserved-pdf");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "conflict" });
	});

	it("rejects a file that changes while its bytes are read", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: pdfBytes,
		});
		const get = drive.files.get.getMockImplementation();
		if (!get) throw new Error("Missing synthetic Drive reader");
		drive.files.get.mockImplementation(async (input) => {
			const result = await get(input);
			if (input.alt === "media")
				drive.records.set("reserved-pdf", {
					metadata: { ...pdfMetadata("pdf"), version: "2" },
					bytes: pdfBytes,
				});
			return result;
		});
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-folder",
		);
		const repository = new GoogleDrivePdfRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.binary(),
			adapter.folders(),
			adapter.sharing(),
		);

		// Act
		const operation = repository.find(exportIdentity, "reserved-pdf");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "conflict" });
	});
});
