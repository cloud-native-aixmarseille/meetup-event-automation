import { describe, expect, it, vi } from "vitest";
import {
	createPdfDrive,
	exportIdentity,
	pdfBytes,
	pdfMetadata,
} from "../testing/pdf-drive.fixtures.js";
import { DrivePdfLookup } from "./drive-pdf-lookup.js";
import { DrivePdfMetadata } from "./drive-pdf-metadata.js";

describe("DrivePdfLookup", () => {
	it("rejects duplicate identity across event and shared public folders", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: pdfBytes,
		});
		drive.records.set("duplicate", {
			metadata: {
				...pdfMetadata("pdf", "duplicate"),
				parents: ["public-folder"],
			},
			bytes: pdfBytes,
		});
		const lookup = new DrivePdfLookup(drive.client, new DrivePdfMetadata(), {
			resolve: vi.fn().mockResolvedValue("public-folder"),
		});

		// Act
		const operation = lookup.find(exportIdentity, "pdf", "reserved-pdf");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "recovery" });
	});
	it("finds an export by metadata in its current event folder", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: pdfBytes,
		});
		const lookup = new DrivePdfLookup(drive.client, new DrivePdfMetadata(), {
			resolve: vi.fn().mockResolvedValue("public-folder"),
		});

		// Act
		const file = await lookup.find(exportIdentity, "pdf");

		// Assert
		expect(file?.id).toBe("reserved-pdf");
		expect(drive.files.list).toHaveBeenCalledWith(
			expect.objectContaining({
				supportsAllDrives: true,
				includeItemsFromAllDrives: true,
			}),
			{ retry: false, timeout: 30_000 },
		);
	});

	it("checks a reserved ID directly when search does not return it", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: pdfBytes,
		});
		drive.files.list.mockResolvedValue({ data: { files: [] } });
		const lookup = new DrivePdfLookup(drive.client, new DrivePdfMetadata(), {
			resolve: vi.fn().mockResolvedValue("public-folder"),
		});

		// Act
		const file = await lookup.find(exportIdentity, "pdf", "reserved-pdf");

		// Assert
		expect(file?.id).toBe("reserved-pdf");
		expect(drive.files.get).toHaveBeenCalledWith(
			expect.objectContaining({ fileId: "reserved-pdf" }),
			expect.anything(),
		);
	});

	it("rejects duplicates even when one matches the reserved ID", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.files.list.mockResolvedValue({
			data: { files: [pdfMetadata("pdf"), pdfMetadata("pdf", "duplicate")] },
		});
		const lookup = new DrivePdfLookup(drive.client, new DrivePdfMetadata(), {
			resolve: vi.fn().mockResolvedValue("public-folder"),
		});

		// Act
		const operation = lookup.find(exportIdentity, "pdf", "reserved-pdf");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "recovery" });
	});

	it.each([{ incompleteSearch: true }, { nextPageToken: "more" }])(
		"fails incomplete lookup %# without using partial evidence",
		async (flags) => {
			// Arrange
			const drive = createPdfDrive();
			drive.files.list.mockResolvedValue({ data: { files: [], ...flags } });
			const lookup = new DrivePdfLookup(drive.client, new DrivePdfMetadata(), {
				resolve: vi.fn().mockResolvedValue("public-folder"),
			});

			// Act
			const operation = lookup.find(exportIdentity, "pdf");

			// Assert
			await expect(operation).rejects.toThrow("search is incomplete");
			expect(drive.files.get).not.toHaveBeenCalled();
		},
	);

	it("rejects a managed PDF with an unexpected identity", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.files.list.mockResolvedValue({
			data: { files: [pdfMetadata("pdf", "other")] },
		});
		const lookup = new DrivePdfLookup(drive.client, new DrivePdfMetadata(), {
			resolve: vi.fn().mockResolvedValue("public-folder"),
		});

		// Act
		const operation = lookup.find(exportIdentity, "pdf", "reserved-pdf");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "recovery" });
	});

	it("treats a missing reserved ID as absent", async () => {
		// Arrange
		const drive = createPdfDrive();
		const lookup = new DrivePdfLookup(drive.client, new DrivePdfMetadata(), {
			resolve: vi.fn().mockResolvedValue("public-folder"),
		});

		// Act
		const result = await lookup.find(exportIdentity, "pdf", "reserved-pdf");

		// Assert
		expect(result).toBeUndefined();
	});

	it("propagates access failures instead of treating them as missing files", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.files.get.mockRejectedValue(
			Object.assign(new Error("access denied"), { response: { status: 403 } }),
		);
		const lookup = new DrivePdfLookup(drive.client, new DrivePdfMetadata(), {
			resolve: vi.fn().mockResolvedValue("public-folder"),
		});

		// Act
		const operation = lookup.get("reserved-pdf");

		// Assert
		await expect(operation).rejects.toThrow("access denied");
	});
});
