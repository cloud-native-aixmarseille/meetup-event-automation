import { describe, expect, it } from "vitest";
import { GoogleDrivePdfComposition } from "../../packages/adapter/publication/google-drive-asset-repository/src/pdf-export-composition.js";
import {
	createPdfDrive,
	exportIdentity,
} from "../../packages/adapter/publication/google-drive-asset-repository/testing/pdf-drive.fixtures.js";
import { PublicationDomainComposition } from "../../packages/domain/publication/src/dependency-composition.js";

function journey(drive: ReturnType<typeof createPdfDrive>) {
	const adapter = new GoogleDrivePdfComposition(
		drive.client,
		"public-folder",
		drive.download,
	);
	return new PublicationDomainComposition().reconcileSlidePdf(
		adapter.source(),
		adapter.repository(),
		adapter.states(),
	);
}

const input = {
	eligible: true,
	sourceReady: true,
	date: "2026-10-15",
	container: {
		id: exportIdentity.folderId,
		eventId: exportIdentity.eventId,
		name: "Event",
		url: "https://drive.google.com/drive/folders/event-folder",
	},
	source: {
		id: exportIdentity.sourceId,
		templateId: exportIdentity.templateId,
		name: "Slides",
	},
};

describe("PDF file sharing", () => {
	it("shares only the verified PDF and leaves the folder, slides and state private", async () => {
		// Arrange
		const drive = createPdfDrive();

		// Act
		const result = await journey(drive).execute(input);
		const unchanged = await journey(drive).execute(input);

		// Assert
		expect(result).toMatchObject({ status: "ready", updated: true });
		expect(unchanged).toMatchObject({ status: "ready", updated: false });
		expect(drive.permissions.create).toHaveBeenCalledOnce();
		expect(drive.permissions.create).toHaveBeenCalledWith(
			expect.objectContaining({
				fileId: "reserved-pdf",
				requestBody: {
					type: "anyone",
					role: "reader",
					allowFileDiscovery: false,
				},
			}),
			{ retry: false, timeout: 30_000 },
		);
		for (const [id, file] of drive.records) {
			if (id !== "reserved-pdf")
				expect(file.metadata.permissions ?? []).toEqual([]);
		}
		expect(drive.download.export).toHaveBeenCalledOnce();
	});

	it.each([false, true])(
		"recovers an uncertain permission grant without a new PDF (applied=%s)",
		async (applied) => {
			// Arrange
			const drive = createPdfDrive();
			const create = drive.permissions.create.getMockImplementation();
			if (!create) throw new Error("Synthetic sharing missing");
			drive.permissions.create.mockImplementationOnce(async (request) => {
				if (applied) await create(request);
				throw new Error("permission response lost");
			});

			// Act
			const failed = await journey(drive)
				.execute(input)
				.catch((error) => error);
			const recovered = await journey(drive).execute(input);

			// Assert
			expect(failed).toBeInstanceOf(Error);
			expect(recovered).toMatchObject({ status: "ready", updated: !applied });
			expect(drive.permissions.create).toHaveBeenCalledTimes(applied ? 1 : 2);
			expect(drive.download.export).toHaveBeenCalledOnce();
			expect(drive.files.generateIds).toHaveBeenCalledOnce();
			expect(
				[...drive.records.values()].filter(
					(f) => f.metadata.mimeType === "application/pdf",
				),
			).toHaveLength(1);
		},
	);

	it("keeps readiness pending until the file permission is verified", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.permissions.create.mockResolvedValue({ data: { id: "ignored" } });

		// Act
		const result = await journey(drive).execute(input);

		// Assert
		expect(result).toMatchObject({ status: "pending" });
		expect(result.diagnostics).toEqual([
			expect.objectContaining({ code: "publication.assets.pdf.sharing" }),
		]);
		expect(result).not.toHaveProperty("url");
		expect(drive.files.generateIds).toHaveBeenCalledOnce();
	});

	it("repairs missing file access without replacing or exporting the PDF again", async () => {
		// Arrange
		const drive = createPdfDrive();
		await journey(drive).execute(input);
		const pdf = drive.records.get("reserved-pdf");
		if (!pdf) throw new Error("Synthetic PDF missing");
		pdf.metadata.permissions = [];

		// Act
		const result = await journey(drive).execute(input);

		// Assert
		expect(result).toMatchObject({ status: "ready", updated: true });
		expect(drive.permissions.create).toHaveBeenCalledTimes(2);
		expect(drive.download.export).toHaveBeenCalledOnce();
		expect(drive.files.generateIds).toHaveBeenCalledOnce();
	});

	it("reports denied sharing for organizer correction and resumes with the same PDF", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.permissions.create.mockRejectedValueOnce(
			Object.assign(new Error("Forbidden"), { response: { status: 403 } }),
		);

		// Act
		const denied = await journey(drive).execute(input);
		const recovered = await journey(drive).execute(input);

		// Assert
		expect(denied).toMatchObject({
			status: "pending",
			diagnostics: [
				expect.objectContaining({ code: "publication.assets.pdf.sharing" }),
			],
		});
		expect(denied).not.toHaveProperty("url");
		expect(recovered.status).toBe("ready");
		expect(drive.download.export).toHaveBeenCalledOnce();
		expect(drive.files.generateIds).toHaveBeenCalledOnce();
	});
});
