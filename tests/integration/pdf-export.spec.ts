import { describe, expect, it } from "vitest";
import { GoogleDrivePdfComposition } from "../../packages/adapter/publication/google-drive-asset-repository/src/pdf-export-composition.js";
import {
	createPdfDrive,
	exportIdentity,
	pdfBytes,
	publicFolderId,
} from "../../packages/adapter/publication/google-drive-asset-repository/testing/pdf-drive.fixtures.js";
import { PublicationDomainComposition } from "../../packages/domain/publication/src/dependency-composition.js";

function exportJourney(drive: ReturnType<typeof createPdfDrive>) {
	const adapter = new GoogleDrivePdfComposition(
		drive.client,
		publicFolderId,
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

describe("presentation PDF export", () => {
	it("reuses the same shared destination for distinct events", async () => {
		// Arrange
		const drive = createPdfDrive();
		const secondSource = { ...input.source, id: "second-slides" };
		const secondContainer = {
			...input.container,
			id: "second-event",
			eventId: "example/meetups#43",
		};
		const source = drive.records.get(exportIdentity.sourceId);
		if (!source) throw new Error("Synthetic source missing");
		drive.records.set(secondSource.id, {
			...source,
			metadata: {
				...source.metadata,
				id: secondSource.id,
				parents: [secondContainer.id],
			},
		});
		drive.files.generateIds
			.mockResolvedValueOnce({ data: { ids: ["reserved-pdf"] } })
			.mockResolvedValueOnce({ data: { ids: ["second-pdf"] } });

		// Act
		const first = await exportJourney(drive).execute(input);
		const second = await exportJourney(drive).execute({
			...input,
			source: secondSource,
			container: secondContainer,
		});
		const rerun = await exportJourney(drive).execute(input);

		// Assert
		expect([first.status, second.status, rerun.status]).toEqual([
			"ready",
			"ready",
			"ready",
		]);
		expect(rerun.updated).toBe(false);
		expect(drive.records.get("reserved-pdf")?.metadata.parents).toEqual([
			"public-folder",
		]);
		expect(drive.records.get("second-pdf")?.metadata.parents).toEqual([
			"public-folder",
		]);
		expect(
			drive.files.create.mock.calls.every(
				([request]) =>
					request.requestBody?.mimeType !==
					"application/vnd.google-apps.folder",
			),
		).toBe(true);
	});

	it("leaves the PDF and private state intact when moving is denied", async () => {
		// Arrange
		const drive = createPdfDrive();
		const update = drive.files.update.getMockImplementation();
		if (!update) throw new Error("Synthetic writer missing");
		drive.files.update.mockImplementation(async (request) => {
			if (request.addParents) throw new Error("move denied");
			return update(request);
		});

		// Act
		const operation = exportJourney(drive).execute(input);

		// Assert
		await expect(operation).rejects.toThrow("move denied");
		expect(drive.records.get("reserved-pdf")?.metadata.parents).toEqual([
			exportIdentity.folderId,
		]);
		expect(
			[...drive.records.values()].find(
				(file) => file.metadata.mimeType === "application/json",
			)?.metadata.parents,
		).toEqual([exportIdentity.folderId]);
	});

	it("moves the verified PDF into the configured destination while keeping source and state in the event folder", async () => {
		// Arrange
		const drive = createPdfDrive();

		// Act
		const result = await exportJourney(drive).execute(input);
		const folder = drive.records.get(publicFolderId);
		const state = [...drive.records.values()].find(
			(file) => file.metadata.mimeType === "application/json",
		);

		// Assert
		expect(result).toMatchObject({ status: "ready", updated: true });
		expect(folder?.metadata).toMatchObject({
			mimeType: "application/vnd.google-apps.folder",
			parents: ["shared-assets"],
		});
		expect(drive.records.get("reserved-pdf")?.metadata.parents).toEqual([
			folder?.metadata.id,
		]);
		expect(state?.metadata.parents).toEqual([exportIdentity.folderId]);
		expect(
			drive.records.get(exportIdentity.sourceId)?.metadata.parents,
		).toEqual([exportIdentity.folderId]);
	});

	it.each([false, true])(
		"recovers a move with an uncertain outcome (applied=%s)",
		async (applied) => {
			// Arrange
			const drive = createPdfDrive();
			const update = drive.files.update.getMockImplementation();
			if (!update) throw new Error("Synthetic writer missing");
			drive.files.update.mockImplementation(async (request) => {
				if (request.addParents) {
					if (applied) await update(request);
					throw new Error("move response lost");
				}
				return update(request);
			});

			// Act
			const failed = await exportJourney(drive)
				.execute(input)
				.catch((error) => error);
			drive.files.update.mockImplementation(update);
			const recovered = await exportJourney(drive).execute(input);
			const folder = drive.records.get(publicFolderId);

			// Assert
			expect(failed).toBeInstanceOf(Error);
			expect(recovered).toMatchObject({ status: "ready", updated: true });
			expect(drive.permissions.create).toHaveBeenCalledOnce();
			expect(drive.download.export).toHaveBeenCalledOnce();
			expect(drive.files.create).toHaveBeenCalledTimes(2);
			expect(drive.records.get("reserved-pdf")?.metadata.parents).toEqual([
				folder?.metadata.id,
			]);
		},
	);

	it("recovers pending state after an uncertain sidecar creation", async () => {
		// Arrange
		const drive = createPdfDrive();
		const create = drive.files.create.getMockImplementation();
		if (!create) throw new Error("Synthetic writer missing");
		drive.files.create.mockImplementationOnce(async (request) => {
			await create(request);
			throw new Error("state response lost");
		});

		// Act
		const failed = await exportJourney(drive)
			.execute(input)
			.catch((error) => error);
		const uploadsBeforeRecovery = drive.files.create.mock.calls.filter(
			([request]) => request.requestBody?.mimeType === "application/pdf",
		).length;
		const recovered = await exportJourney(drive).execute(input);

		// Assert
		expect(failed).toBeInstanceOf(Error);
		expect(uploadsBeforeRecovery).toBe(0);
		expect(recovered.status).toBe("ready");
		expect(drive.files.generateIds).toHaveBeenCalledOnce();
		expect(
			[...drive.records.values()].filter(
				(file) => file.metadata.mimeType === "application/json",
			),
		).toHaveLength(1);
	});

	it("verifies a completed export after losing the confirmation response", async () => {
		// Arrange
		const drive = createPdfDrive();
		const update = drive.files.update.getMockImplementation();
		if (!update) throw new Error("Synthetic writer missing");
		drive.files.update.mockImplementationOnce(async (request) => {
			await update(request);
			throw new Error("confirmation response lost");
		});

		// Act
		const failed = await exportJourney(drive)
			.execute(input)
			.catch((error) => error);
		const recovered = await exportJourney(drive).execute(input);

		// Assert
		expect(failed).toBeInstanceOf(Error);
		expect(recovered).toMatchObject({ status: "ready", updated: true });
		expect(drive.download.export).toHaveBeenCalledOnce();
		expect(drive.files.create).toHaveBeenCalledTimes(2);
	});
	it("creates once, verifies unchanged reruns and refreshes the same file", async () => {
		// Arrange
		const drive = createPdfDrive();

		// Act
		const created = await exportJourney(drive).execute(input);
		const unchanged = await exportJourney(drive).execute(input);
		const source = drive.records.get(exportIdentity.sourceId);
		if (!source) throw new Error("Synthetic source missing");
		drive.records.set(exportIdentity.sourceId, {
			...source,
			metadata: { ...source.metadata, version: "2" },
		});
		const refreshed = await exportJourney(drive).execute(input);

		// Assert
		expect(created.updated).toBe(true);
		expect(unchanged.updated).toBe(false);
		expect(refreshed.updated).toBe(true);
		expect(drive.files.generateIds).toHaveBeenCalledOnce();
		expect(drive.download.export).toHaveBeenCalledTimes(2);
		expect(
			[...drive.records.values()].filter(
				(file) => file.metadata.mimeType === "application/pdf",
			),
		).toHaveLength(1);
		expect(drive.records.get("reserved-pdf")?.bytes).toEqual(pdfBytes);
	});

	it("recovers an uncertain create on the next invocation without another upload", async () => {
		// Arrange
		const drive = createPdfDrive();
		const create = drive.files.create.getMockImplementation();
		if (!create) throw new Error("Synthetic writer missing");
		drive.files.create.mockImplementation(async (request) => {
			const result = await create(request);
			if (request.requestBody?.mimeType === "application/pdf")
				throw new Error("lost upload response");
			return result;
		});

		// Act
		const failed = await exportJourney(drive)
			.execute(input)
			.catch((error) => error);
		const recovered = await exportJourney(drive).execute(input);

		// Assert
		expect(failed).toBeInstanceOf(Error);
		expect(recovered).toMatchObject({ status: "ready", updated: true });
		expect(drive.download.export).toHaveBeenCalledOnce();
		expect(drive.files.create).toHaveBeenCalledTimes(2);
		expect(drive.files.generateIds).toHaveBeenCalledOnce();
	});

	it("retains both files and blocks replacement of a manually edited PDF", async () => {
		// Arrange
		const drive = createPdfDrive();
		await exportJourney(drive).execute(input);
		const pdf = drive.records.get("reserved-pdf");
		if (!pdf) throw new Error("Synthetic PDF missing");
		const edited = Buffer.from("%PDF-1.7\nmanual content\n%%EOF\n");
		drive.records.set("reserved-pdf", {
			...pdf,
			bytes: edited,
			metadata: { ...pdf.metadata, version: "2" },
		});
		const updateCount = drive.files.update.mock.calls.length;

		// Act
		const result = await exportJourney(drive).execute(input);

		// Assert
		expect(result.status).toBe("conflict");
		expect(drive.records.get("reserved-pdf")?.bytes).toEqual(edited);
		expect(drive.records.has(exportIdentity.sourceId)).toBe(true);
		expect(drive.files.update).toHaveBeenCalledTimes(updateCount);
	});

	it("ignores unmanaged same-name files and uses the provided archived folder", async () => {
		// Arrange
		const drive = createPdfDrive();
		drive.records.set("unmanaged", {
			metadata: {
				id: "unmanaged",
				name: "2026-10-15 - Slides.pdf",
				mimeType: "application/pdf",
				parents: [exportIdentity.folderId],
			},
			bytes: pdfBytes,
		});
		const archivedInput = {
			...input,
			container: { ...input.container, name: "Archived event" },
		};

		// Act
		const result = await exportJourney(drive).execute(archivedInput);

		// Assert
		expect(result.status).toBe("ready");
		expect(drive.records.get("unmanaged")?.bytes).toEqual(pdfBytes);
		expect(drive.records.get("reserved-pdf")?.metadata.parents).toEqual([
			"public-folder",
		]);
	});
});
