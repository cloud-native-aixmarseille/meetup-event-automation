import { describe, expect, it } from "vitest";
import {
	createPdfDrive,
	exportIdentity,
	pdfMetadata,
} from "../testing/pdf-drive.fixtures.js";
import { DrivePdfMetadata } from "./drive-pdf-metadata.js";

describe("DrivePdfMetadata", () => {
	it("keeps derived-file identity distinct from template-copy identity", () => {
		// Arrange
		const metadata = new DrivePdfMetadata();

		// Act
		const properties = metadata.properties(exportIdentity, "pdf");

		// Assert
		expect(properties).toMatchObject({
			meetup_pdf_source: exportIdentity.sourceId,
			meetup_pdf_template: exportIdentity.templateId,
			meetup_pdf_contract: "pdf-v1",
		});
		expect(properties).not.toHaveProperty("template_file_id");
		expect(properties).not.toHaveProperty("template_kind");
	});

	it.each([
		{ parents: ["other-folder"] },
		{ mimeType: "text/plain" },
		{ trashed: true },
		{ id: null },
		{ version: null },
		{ description: "other event" },
		{ appProperties: { template_file_id: "template" } },
	])("rejects mismatched managed metadata %#", (patch) => {
		// Arrange
		const metadata = new DrivePdfMetadata();
		const file = { ...pdfMetadata("pdf"), ...patch };

		// Act
		const decode = () => metadata.file(file, exportIdentity, "pdf");

		// Assert
		expect(decode).toThrow(expect.objectContaining({ code: "recovery" }));
	});

	it.each(["folderId", "sourceId", "templateId"] as const)(
		"rejects unsafe %s query values",
		(key) => {
			// Arrange
			const metadata = new DrivePdfMetadata();
			const identity = { ...exportIdentity, [key]: "unsafe'value" };

			// Act
			const validate = () => metadata.validateIdentity(identity);

			// Assert
			expect(validate).toThrow(expect.objectContaining({ code: "recovery" }));
		},
	);

	it("validates a Slides source against its event folder and template", () => {
		// Arrange
		const drive = createPdfDrive();
		const metadata = new DrivePdfMetadata();
		const file = drive.records.get(exportIdentity.sourceId)?.metadata ?? {};

		// Act
		const version = metadata.source(file, exportIdentity);

		// Assert
		expect(version).toBe("1");
	});

	it.each([
		{ mimeType: "application/pdf" },
		{ parents: ["other"] },
		{ appProperties: {} },
		{ trashed: true },
	])("rejects an unsupported or mismatched source %#", (patch) => {
		// Arrange
		const drive = createPdfDrive();
		const metadata = new DrivePdfMetadata();
		const file = {
			...drive.records.get(exportIdentity.sourceId)?.metadata,
			...patch,
		};

		// Act
		const decode = () => metadata.source(file, exportIdentity);

		// Assert
		expect(decode).toThrow(expect.objectContaining({ code: "source" }));
	});
});
