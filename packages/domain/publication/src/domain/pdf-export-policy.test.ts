import { describe, expect, it } from "vitest";
import {
	confirmedPdf,
	pdfIdentity,
	pdfObservation,
	pdfSnapshot,
} from "../../testing/pdf-export.fixtures.js";
import { PdfExportPolicy } from "./pdf-export-policy.js";

describe("PdfExportPolicy", () => {
	it.each([
		["Slides", "2026-10-15 - Slides.pdf"],
		["Slides 2026-10-15", "Slides 2026-10-15.pdf"],
	])("dates the PDF derived from %s", (name, expected) => {
		// Arrange
		const policy = new PdfExportPolicy();

		// Act
		const result = policy.name(name, "2026-10-15");

		// Assert
		expect(result).toBe(expected);
	});

	it("bounds long derived filenames", () => {
		// Arrange
		const policy = new PdfExportPolicy();

		// Act
		const name = policy.name("a".repeat(500), "2026-10-15");

		// Assert
		expect(name).toHaveLength(204);
		expect(name).toMatch(/^2026-10-15.*\.pdf$/);
	});

	it.each(["eventId", "folderId", "sourceId", "templateId"] as const)(
		"rejects a different %s identity",
		(key) => {
			// Arrange
			const policy = new PdfExportPolicy();
			const changed = { ...pdfIdentity, [key]: "different" };

			// Act
			const result = policy.sameIdentity(pdfIdentity, changed);

			// Assert
			expect(result).toBe(false);
		},
	);

	it("compares identity fields independently of property order", () => {
		// Arrange
		const policy = new PdfExportPolicy();
		const reordered = {
			templateId: pdfIdentity.templateId,
			sourceId: pdfIdentity.sourceId,
			eventId: pdfIdentity.eventId,
			folderId: pdfIdentity.folderId,
		};

		// Act
		const result = policy.sameIdentity(pdfIdentity, reordered);

		// Assert
		expect(result).toBe(true);
	});

	it("rejects a different managed file even with identical bytes", () => {
		// Arrange
		const policy = new PdfExportPolicy();
		const observed = { ...pdfObservation, id: "duplicate" };

		// Act
		const recover = () => policy.recover(confirmedPdf, observed);

		// Assert
		expect(recover).toThrow(expect.objectContaining({ code: "recovery" }));
	});

	it("does not recover a new pending PDF from a marker without matching content", () => {
		// Arrange
		const policy = new PdfExportPolicy();
		const state = {
			identity: pdfIdentity,
			fileId: "pdf",
			pending: pdfSnapshot,
		};
		const observed = { ...pdfObservation, fingerprint: "b".repeat(64) };

		// Act
		const recover = () => policy.recover(state, observed);

		// Assert
		expect(recover).toThrow(expect.objectContaining({ code: "conflict" }));
	});
});
