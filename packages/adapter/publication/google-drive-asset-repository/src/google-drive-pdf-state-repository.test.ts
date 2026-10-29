import { describe, expect, it } from "vitest";
import {
	createPdfDrive,
	exportIdentity,
	exportSnapshot,
	exportState,
	pdfMetadata,
} from "../testing/pdf-drive.fixtures.js";
import { GoogleDrivePdfStateRepository } from "./google-drive-pdf-state-repository.js";
import { GoogleDrivePdfComposition } from "./pdf-export-composition.js";

describe("GoogleDrivePdfStateRepository", () => {
	it("treats an unverified persistence response as a technical failure", async () => {
		// Arrange
		const drive = createPdfDrive();
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-root",
			drive.download,
		);
		const repository = new GoogleDrivePdfStateRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.stream(),
			adapter.codec(),
		);
		await repository.load(exportIdentity);
		drive.files.create.mockResolvedValue({ data: {} });

		// Act
		const operation = repository.save(exportState);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "invalid" });
	});
	it("persists a dedicated sidecar before confirming it in place", async () => {
		// Arrange
		const drive = createPdfDrive();
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-root",
			drive.download,
		);
		const repository = new GoogleDrivePdfStateRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.stream(),
			adapter.codec(),
		);

		// Act
		const initial = await repository.load(exportIdentity);
		await repository.save(exportState);
		await repository.save({
			...exportState,
			pending: undefined,
			confirmed: exportSnapshot,
		});
		const loaded = await new GoogleDrivePdfStateRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.stream(),
			adapter.codec(),
		).load(exportIdentity);

		// Assert
		expect(initial).toBeUndefined();
		expect(drive.files.create).toHaveBeenCalledOnce();
		expect(drive.files.update).toHaveBeenCalledOnce();
		expect(loaded).toEqual({
			...exportState,
			pending: undefined,
			confirmed: exportSnapshot,
		});
		expect(drive.files.create).toHaveBeenCalledWith(
			expect.objectContaining({
				requestBody: expect.objectContaining({
					name: ".source-slides.pdf-export.json",
					parents: [exportIdentity.folderId],
					appProperties: expect.objectContaining({
						meetup_pdf_state: exportIdentity.sourceId,
					}),
				}),
			}),
			{ retry: false, timeout: 30_000 },
		);
	});

	it.each([
		Buffer.from("invalid JSON"),
		Buffer.alloc(65_537),
		Buffer.from('{"version":2}'),
	])("requires explicit recovery for invalid sidecar content %#", (bytes) => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("state", { metadata: pdfMetadata("state"), bytes });
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-root",
			drive.download,
		);
		const repository = new GoogleDrivePdfStateRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.stream(),
			adapter.codec(),
		);

		// Act
		const operation = repository.load(exportIdentity);

		// Assert
		return expect(operation).rejects.toMatchObject({ code: "recovery" });
	});

	it("rejects saving without observing prior export state", async () => {
		// Arrange
		const drive = createPdfDrive();
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-root",
			drive.download,
		);
		const repository = new GoogleDrivePdfStateRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.stream(),
			adapter.codec(),
		);

		// Act
		const operation = repository.save(exportState);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "recovery" });
		expect(drive.files.create).not.toHaveBeenCalled();
	});

	it.each(["changed", "missing"])(
		"preserves a %s sidecar instead of overwriting its state",
		async (scenario) => {
			// Arrange
			const drive = createPdfDrive();
			const metadata = pdfMetadata("state");
			const bytes = Buffer.from(JSON.stringify({ version: 1, ...exportState }));
			drive.records.set("state", { metadata, bytes });
			const adapter = new GoogleDrivePdfComposition(
				drive.client,
				"public-root",
				drive.download,
			);
			const repository = new GoogleDrivePdfStateRepository(
				drive.client,
				adapter.lookup(),
				adapter.metadata(),
				adapter.stream(),
				adapter.codec(),
			);
			await repository.load(exportIdentity);
			if (scenario === "changed")
				drive.records.set("state", {
					metadata: { ...metadata, version: "2" },
					bytes,
				});
			else drive.records.delete("state");

			// Act
			const operation = repository.save(exportState);

			// Assert
			await expect(operation).rejects.toMatchObject({ code: "recovery" });
			expect(drive.files.update).not.toHaveBeenCalled();
			expect(drive.files.create).not.toHaveBeenCalled();
		},
	);

	it("rejects duplicate export-state sidecars", async () => {
		// Arrange
		const drive = createPdfDrive();
		const bytes = Buffer.from(JSON.stringify({ version: 1, ...exportState }));
		drive.records.set("state", { metadata: pdfMetadata("state"), bytes });
		drive.records.set("duplicate", {
			metadata: pdfMetadata("state", "duplicate"),
			bytes,
		});
		const adapter = new GoogleDrivePdfComposition(
			drive.client,
			"public-root",
			drive.download,
		);
		const repository = new GoogleDrivePdfStateRepository(
			drive.client,
			adapter.lookup(),
			adapter.metadata(),
			adapter.stream(),
			adapter.codec(),
		);

		// Act
		const operation = repository.load(exportIdentity);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "recovery" });
	});
});
