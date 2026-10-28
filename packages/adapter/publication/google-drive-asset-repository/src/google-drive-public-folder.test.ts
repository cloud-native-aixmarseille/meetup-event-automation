import { describe, expect, it } from "vitest";
import {
	createPdfDrive,
	exportIdentity,
	publicFolderId,
} from "../testing/pdf-drive.fixtures.js";
import { DrivePdfMetadata } from "./drive-pdf-metadata.js";
import { GoogleDrivePublicFolder } from "./google-drive-public-folder.js";

describe("GoogleDrivePublicFolder", () => {
	it.each(["public", "Shared presentations", "Renamed destination"])(
		"resolves the configured folder by ID regardless of its name: %s",
		async (name) => {
			// Arrange
			const drive = createPdfDrive();
			const record = drive.records.get(publicFolderId);
			if (!record) throw new Error("Synthetic folder missing");
			drive.records.set(publicFolderId, {
				...record,
				metadata: { ...record.metadata, name },
			});
			const folder = new GoogleDrivePublicFolder(
				drive.client,
				new DrivePdfMetadata(),
				publicFolderId,
			);

			// Act
			const id = await folder.resolve(exportIdentity);

			// Assert
			expect(id).toBe(publicFolderId);
			expect(drive.files.get).toHaveBeenCalledWith(
				expect.objectContaining({
					fileId: publicFolderId,
					supportsAllDrives: true,
				}),
				{ retry: false, timeout: 30_000 },
			);
			expect(drive.files.list).not.toHaveBeenCalled();
			expect(drive.files.create).not.toHaveBeenCalled();
			expect(drive.files.update).not.toHaveBeenCalled();
		},
	);

	it.each([
		"",
		"unsafe'id",
		exportIdentity.folderId,
		exportIdentity.sourceId,
		exportIdentity.templateId,
	])("rejects an unsafe destination %s before contacting Drive", async (id) => {
		// Arrange
		const drive = createPdfDrive();
		const folder = new GoogleDrivePublicFolder(
			drive.client,
			new DrivePdfMetadata(),
			id,
		);

		// Act
		const operation = folder.resolve(exportIdentity);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "recovery" });
		expect(drive.files.get).not.toHaveBeenCalled();
	});

	it.each([
		{ mimeType: "application/pdf" },
		{ trashed: true },
		{ id: "other" },
	])("rejects a mismatched public destination %#", async (patch) => {
		// Arrange
		const drive = createPdfDrive();
		const record = drive.records.get(publicFolderId);
		if (!record) throw new Error("Synthetic folder missing");
		drive.records.set(publicFolderId, {
			...record,
			metadata: { ...record.metadata, ...patch },
		});
		const folder = new GoogleDrivePublicFolder(
			drive.client,
			new DrivePdfMetadata(),
			publicFolderId,
		);

		// Act
		const operation = folder.resolve(exportIdentity);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "recovery" });
	});

	it("propagates access failures without creating a replacement folder", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.files.get.mockRejectedValue(new Error("access denied"));
		const folder = new GoogleDrivePublicFolder(
			drive.client,
			new DrivePdfMetadata(),
			publicFolderId,
		);

		// Act
		const operation = folder.resolve(exportIdentity);

		// Assert
		await expect(operation).rejects.toThrow("access denied");
		expect(drive.files.create).not.toHaveBeenCalled();
	});
});
