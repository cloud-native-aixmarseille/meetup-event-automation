import { describe, expect, it } from "vitest";
import {
	createPdfDrive,
	pdfBytes,
	pdfMetadata,
} from "../testing/pdf-drive.fixtures.js";
import { GoogleDrivePdfSharing } from "./google-drive-pdf-sharing.js";

describe("GoogleDrivePdfSharing", () => {
	it("grants and verifies unlisted reader access to an individual file", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("reserved-pdf", {
			metadata: pdfMetadata("pdf"),
			bytes: pdfBytes,
		});
		const sharing = new GoogleDrivePdfSharing(drive.client);

		// Act
		const changed = await sharing.ensure("reserved-pdf");

		// Assert
		expect(changed).toBe(true);
		expect(drive.permissions.list).toHaveBeenCalledTimes(2);
		expect(drive.records.get("reserved-pdf")?.metadata.permissions).toEqual([
			{
				id: "anyoneWithLink",
				type: "anyone",
				role: "reader",
				allowFileDiscovery: false,
			},
		]);
	});

	it("checks every permission page before reusing existing reader access", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.permissions.list
			.mockResolvedValueOnce({
				data: {
					permissions: [{ type: "user", role: "writer" }],
					nextPageToken: "next",
				},
			})
			.mockResolvedValueOnce({
				data: {
					permissions: [
						{ type: "anyone", role: "reader", allowFileDiscovery: false },
					],
				},
			});
		const sharing = new GoogleDrivePdfSharing(drive.client);

		// Act
		const changed = await sharing.ensure("reserved-pdf");

		// Assert
		expect(changed).toBe(false);
		expect(drive.permissions.list).toHaveBeenCalledTimes(2);
		expect(drive.permissions.create).not.toHaveBeenCalled();
	});

	it.each([
		{ type: "anyone", role: "writer", allowFileDiscovery: false },
		{ type: "anyone", role: "reader", allowFileDiscovery: true },
		{ type: "anyone", role: "reader", view: "published" },
		{ type: "anyone" },
	])(
		"does not overwrite incompatible public access: %j",
		async (permission) => {
			// Arrange
			const drive = createPdfDrive();
			drive.permissions.list.mockResolvedValue({
				data: { permissions: [permission] },
			});
			const sharing = new GoogleDrivePdfSharing(drive.client);

			// Act
			const operation = sharing.ensure("reserved-pdf");

			// Assert
			await expect(operation).rejects.toMatchObject({ code: "sharing" });
			expect(drive.permissions.create).not.toHaveBeenCalled();
		},
	);

	it("refuses ambiguous public permissions", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.permissions.list.mockResolvedValue({
			data: {
				permissions: [
					{ type: "anyone", role: "reader" },
					{ type: "anyone", role: "reader" },
				],
			},
		});
		const sharing = new GoogleDrivePdfSharing(drive.client);

		// Act
		const operation = sharing.ensure("reserved-pdf");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "sharing" });
		expect(drive.permissions.create).not.toHaveBeenCalled();
	});

	it("does not grant access after an incomplete permission listing", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.permissions.list.mockResolvedValue({
			data: { permissions: [], nextPageToken: "repeated" },
		});
		const sharing = new GoogleDrivePdfSharing(drive.client);

		// Act
		const operation = sharing.ensure("reserved-pdf");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "invalid" });
		expect(drive.permissions.create).not.toHaveBeenCalled();
	});

	it("preserves a denied permission read without attempting a grant", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.permissions.list.mockRejectedValue(new Error("access denied"));
		const sharing = new GoogleDrivePdfSharing(drive.client);

		// Act
		const operation = sharing.ensure("reserved-pdf");

		// Assert
		await expect(operation).rejects.toThrow("access denied");
		expect(drive.permissions.create).not.toHaveBeenCalled();
	});

	it("rejects malformed permission results before granting access", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.permissions.list.mockResolvedValue({ data: {} });
		const sharing = new GoogleDrivePdfSharing(drive.client);

		// Act
		const operation = sharing.ensure("reserved-pdf");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "invalid" });
		expect(drive.permissions.create).not.toHaveBeenCalled();
	});

	it("rejects invalid file identities before provider calls", async () => {
		// Arrange
		const drive = createPdfDrive();
		const sharing = new GoogleDrivePdfSharing(drive.client);

		// Act
		const operation = sharing.ensure("../folder");

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "invalid" });
		expect(drive.permissions.list).not.toHaveBeenCalled();
		expect(drive.permissions.create).not.toHaveBeenCalled();
	});
});
