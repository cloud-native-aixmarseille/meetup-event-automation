import { describe, expect, it, vi } from "vitest";
import { exportIdentity } from "../testing/pdf-drive.fixtures.js";
import { DrivePdfMetadata } from "./drive-pdf-metadata.js";
import { DrivePublicFolderError } from "./drive-public-folder-error.js";
import { GoogleDrivePublicFolder } from "./google-drive-public-folder.js";

describe("PDF public folder identity", () => {
	it("resolves the slides destination independently of the public root", async () => {
		// Arrange
		const folders = { resolve: vi.fn(async () => "slides-folder") };
		const folder = new GoogleDrivePublicFolder(
			folders,
			new DrivePdfMetadata(),
			"public-root",
		);

		// Act
		const id = await folder.resolve(exportIdentity);

		// Assert
		expect(id).toBe("slides-folder");
		expect(folders.resolve).toHaveBeenCalledOnce();
	});
	it.each([
		"",
		"unsafe'id",
		exportIdentity.folderId,
		exportIdentity.sourceId,
		exportIdentity.templateId,
	])("rejects unsafe root %s before Drive lookup", async (id) => {
		// Arrange
		const folders = { resolve: vi.fn() };
		const folder = new GoogleDrivePublicFolder(
			folders,
			new DrivePdfMetadata(),
			id,
		);

		// Act
		const result = folder.resolve(exportIdentity);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "recovery" });
		expect(folders.resolve).not.toHaveBeenCalled();
	});
	it.each([
		exportIdentity.folderId,
		exportIdentity.sourceId,
		exportIdentity.templateId,
	])("rejects a protected child destination %s", async (id) => {
		// Arrange
		const folders = { resolve: vi.fn(async () => id) };
		const folder = new GoogleDrivePublicFolder(
			folders,
			new DrivePdfMetadata(),
			"public-root",
		);

		// Act
		const result = folder.resolve(exportIdentity);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "recovery" });
	});
	it.each(["layout", "transport"])(
		"retains the %s failure category",
		async (kind) => {
			// Arrange
			const error =
				kind === "layout"
					? new DrivePublicFolderError("Missing slides")
					: new Error("Access denied");
			const folders = { resolve: vi.fn().mockRejectedValue(error) };
			const folder = new GoogleDrivePublicFolder(
				folders,
				new DrivePdfMetadata(),
				"public-root",
			);

			// Act
			const result = folder.resolve(exportIdentity);

			// Assert
			if (kind === "layout")
				await expect(result).rejects.toMatchObject({ code: "recovery" });
			else await expect(result).rejects.toBe(error);
		},
	);
});
