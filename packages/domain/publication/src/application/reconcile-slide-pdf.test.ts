import { describe, expect, it } from "vitest";
import {
	confirmedPdf,
	pdfDependencies,
	pdfIdentity,
	pdfInput,
	pdfObservation,
	pdfSnapshot,
} from "../../testing/pdf-export.fixtures.js";
import { PdfExportError } from "../domain/pdf-export-error.js";
import { PdfExportPolicy } from "../domain/pdf-export-policy.js";
import { ReconcileSlidePdf } from "./reconcile-slide-pdf.js";

describe("ReconcileSlidePdf", () => {
	it("moves verified unchanged content without exporting again", async () => {
		// Arrange
		const subject = pdfSubject(confirmedPdf, pdfObservation);
		subject.files.placeInPublicFolder.mockResolvedValue({
			updated: true,
			url: "https://drive.google.com/file/d/pdf/view",
		});

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result).toMatchObject({ status: "ready", updated: true });
		expect(subject.files.placeInPublicFolder).toHaveBeenCalledWith(
			pdfIdentity,
			pdfObservation,
		);
		expect(subject.source.export).not.toHaveBeenCalled();
		expect(subject.files.write).not.toHaveBeenCalled();
	});

	it("keeps confirmed state when placement fails and retries placement on rerun", async () => {
		// Arrange
		const subject = pdfSubject();
		subject.files.placeInPublicFolder.mockRejectedValueOnce(
			new Error("move failed"),
		);

		// Act
		const failed = await subject.useCase
			.execute(pdfInput)
			.catch((error) => error);
		const state = subject.getState();
		const recovered = await subject.useCase.execute(pdfInput);

		// Assert
		expect(failed).toBeInstanceOf(Error);
		expect(state).toEqual(confirmedPdf);
		expect(recovered.status).toBe("ready");
		expect(subject.files.placeInPublicFolder).toHaveBeenCalledTimes(2);
		expect(subject.source.export).toHaveBeenCalledOnce();
		expect(subject.files.write).toHaveBeenCalledOnce();
	});
	it("clears a pending rename when the desired filename matches confirmed content", async () => {
		// Arrange
		const subject = pdfSubject(
			{
				...confirmedPdf,
				pending: { ...pdfSnapshot, name: "2026-10-16 - Slides.pdf" },
			},
			pdfObservation,
		);

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result).toMatchObject({ status: "ready", updated: false });
		expect(subject.getState()).toEqual(confirmedPdf);
		expect(subject.source.export).not.toHaveBeenCalled();
		expect(subject.files.write).not.toHaveBeenCalled();
	});
	it("persists intent before uploading and confirms the observed PDF", async () => {
		// Arrange
		const subject = pdfSubject();

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result).toEqual({
			status: "ready",
			updated: true,
			url: "https://drive.google.com/file/d/pdf/view",
			diagnostics: [],
		});
		expect(subject.operations).toEqual(["pending", "upload", "confirmed"]);
		expect(subject.getState()).toEqual(confirmedPdf);
		expect(subject.files.write).toHaveBeenCalledWith(
			expect.objectContaining({
				identity: pdfIdentity,
				fileId: "pdf",
				snapshot: pdfSnapshot,
			}),
		);
	});

	it("verifies unchanged content without exporting or writing", async () => {
		// Arrange
		const subject = pdfSubject(confirmedPdf, pdfObservation);

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result).toMatchObject({ status: "ready", updated: false });
		expect(subject.files.find).toHaveBeenCalledWith(pdfIdentity, "pdf");
		expect(subject.source.export).not.toHaveBeenCalled();
		expect(subject.operations).toEqual([]);
	});

	it.each(["source", "name"])(
		"refreshes a changed %s using the existing PDF identity",
		async (kind) => {
			// Arrange
			const subject = pdfSubject(confirmedPdf, pdfObservation);
			if (kind === "source") subject.source.observe.mockResolvedValue("2");
			const input =
				kind === "name"
					? {
							...pdfInput,
							source: { ...pdfInput.source, name: "Updated presentation" },
						}
					: pdfInput;

			// Act
			const result = await subject.useCase.execute(input);

			// Assert
			expect(result.updated).toBe(true);
			expect(subject.files.reserveId).not.toHaveBeenCalled();
			expect(subject.files.write).toHaveBeenCalledWith(
				expect.objectContaining({ fileId: "pdf", previous: pdfObservation }),
			);
		},
	);

	it.each([
		{ eligible: false, sourceReady: true, status: "not-applicable" },
		{ eligible: true, sourceReady: false, status: "pending" },
	])(
		"preserves files for eligibility=$eligible and source readiness=$sourceReady",
		async (scenario) => {
			// Arrange
			const subject = pdfSubject(confirmedPdf, pdfObservation);

			// Act
			const result = await subject.useCase.execute({
				...pdfInput,
				...scenario,
			});

			// Assert
			expect(result.status).toBe(scenario.status);
			expect(subject.states.load).not.toHaveBeenCalled();
			expect(subject.source.export).not.toHaveBeenCalled();
			expect(subject.operations).toEqual([]);
		},
	);

	it("reports a missing source identity without writing", async () => {
		// Arrange
		const subject = pdfSubject();

		// Act
		const result = await subject.useCase.execute({
			...pdfInput,
			source: undefined,
		});

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.assets.pdf.source");
		expect(subject.operations).toEqual([]);
	});

	it("requires recovery when an existing PDF has no state", async () => {
		// Arrange
		const subject = pdfSubject(undefined, pdfObservation);

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result.status).toBe("recovery-required");
		expect(subject.source.export).not.toHaveBeenCalled();
	});

	it.each(["edited", "missing", "renamed"])(
		"preserves a %s confirmed PDF for manual recovery",
		async (kind) => {
			// Arrange
			const file =
				kind === "missing"
					? undefined
					: {
							...pdfObservation,
							...(kind === "edited"
								? { fingerprint: "b".repeat(64) }
								: { name: "Manual name" }),
						};
			const subject = pdfSubject(confirmedPdf, file);

			// Act
			const result = await subject.useCase.execute(pdfInput);

			// Assert
			expect(result.status).toBe("conflict");
			expect(subject.operations).toEqual([]);
			expect(subject.source.export).not.toHaveBeenCalled();
		},
	);

	it("confirms matching pending bytes after a lost upload response", async () => {
		// Arrange
		const subject = pdfSubject(
			{ identity: pdfIdentity, fileId: "pdf", pending: pdfSnapshot },
			pdfObservation,
		);

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result.status).toBe("ready");
		expect(subject.operations).toEqual(["confirmed"]);
		expect(subject.source.export).not.toHaveBeenCalled();
	});

	it("retries a reserved file ID after an upload that did not create a PDF", async () => {
		// Arrange
		const subject = pdfSubject({
			identity: pdfIdentity,
			fileId: "pdf",
			pending: pdfSnapshot,
		});

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result.status).toBe("ready");
		expect(subject.files.reserveId).not.toHaveBeenCalled();
		expect(subject.files.write).toHaveBeenCalledWith(
			expect.objectContaining({ fileId: "pdf" }),
		);
	});

	it("retries an interrupted update only after verifying prior content", async () => {
		// Arrange
		const subject = pdfSubject(
			{
				...confirmedPdf,
				pending: {
					...pdfSnapshot,
					sourceVersion: "2",
					fingerprint: "b".repeat(64),
				},
			},
			pdfObservation,
		);
		subject.source.observe.mockResolvedValue("2");

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result.status).toBe("ready");
		expect(subject.files.write).toHaveBeenCalledWith(
			expect.objectContaining({ previous: pdfObservation, fileId: "pdf" }),
		);
	});

	it("keeps a changing source pending without storing or uploading its export", async () => {
		// Arrange
		const subject = pdfSubject();
		subject.source.observe.mockResolvedValueOnce("1").mockResolvedValue("2");

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.assets.pdf.revision");
		expect(subject.operations).toEqual([]);
	});

	it("does not upload when pending intent cannot be persisted", async () => {
		// Arrange
		const subject = pdfSubject();
		subject.states.save.mockRejectedValue(
			new Error("state persistence unavailable"),
		);

		// Act
		const operation = subject.useCase.execute(pdfInput);

		// Assert
		await expect(operation).rejects.toThrow("state persistence unavailable");
		expect(subject.files.write).not.toHaveBeenCalled();
	});

	it("retains pending evidence after an uncertain upload", async () => {
		// Arrange
		const subject = pdfSubject();
		subject.files.write.mockRejectedValue(new Error("upload response lost"));

		// Act
		const operation = subject.useCase.execute(pdfInput);

		// Assert
		await expect(operation).rejects.toThrow("upload response lost");
		expect(subject.getState()?.pending).toEqual(pdfSnapshot);
		expect(subject.getState()?.confirmed).toBeUndefined();
	});

	it("recovers confirmed content after a lost success-state response", async () => {
		// Arrange
		const subject = pdfSubject();
		const save = subject.states.save.getMockImplementation();
		if (!save) throw new Error("Missing synthetic state writer");
		subject.states.save.mockImplementation(async (state) => {
			if (!state.pending) throw new Error("confirmation response lost");
			await save?.(state);
		});

		// Act
		const failed = subject.useCase.execute(pdfInput);
		const failure = await failed.catch((error) => error);
		subject.states.save.mockImplementation(save);
		const recovered = await subject.useCase.execute(pdfInput);

		// Assert
		expect(failure).toBeInstanceOf(Error);
		expect(recovered.status).toBe("ready");
		expect(subject.files.write).toHaveBeenCalledOnce();
		expect(subject.source.export).toHaveBeenCalledOnce();
	});

	it("does not confirm a file whose observed bytes differ from intent", async () => {
		// Arrange
		const subject = pdfSubject();
		subject.files.find
			.mockResolvedValueOnce(undefined)
			.mockResolvedValue({ ...pdfObservation, fingerprint: "b".repeat(64) });

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.assets.pdf.invalid");
		expect(subject.getState()?.pending).toBeDefined();
		expect(subject.files.placeInPublicFolder).not.toHaveBeenCalled();
	});

	it("reports an export size limit without exposing provider data", async () => {
		// Arrange
		const subject = pdfSubject();
		subject.source.export.mockRejectedValue(new PdfExportError("limit"));

		// Act
		const result = await subject.useCase.execute(pdfInput);

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.assets.pdf.limit");
		expect(subject.operations).toEqual([]);
	});
});

function pdfSubject(...args: Parameters<typeof pdfDependencies>) {
	const subject = pdfDependencies(...args);
	return {
		...subject,
		useCase: new ReconcileSlidePdf(
			new PdfExportPolicy(),
			subject.source,
			subject.files,
			subject.states,
		),
	};
}
