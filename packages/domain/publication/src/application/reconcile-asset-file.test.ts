import { describe, expect, it, vi } from "vitest";
import { contentFixture } from "../../testing/content.fixtures.js";
import { ContentError } from "../domain/content-error.js";
import type { PublicationDiagnostic } from "../domain/model.js";
import type { AssetRepository } from "./ports.js";
import { ReconcileAssetFile } from "./reconcile-asset-file.js";

describe("asset file failure classification", () => {
	it("does not enroll an existing file while checking recovery", async () => {
		// Arrange
		const f = contentFixture();
		vi.spyOn(f.service, "preflight").mockResolvedValue(undefined);
		const execute = vi.spyOn(f.service, "execute");
		const file = {
			id: f.input.fileId,
			name: "Slides",
			templateId: f.input.templateId,
			kind: "slides",
			mimeType: f.input.mimeType,
			contentManaged: false,
		};
		const repository: AssetRepository = {
			findContainer: vi.fn(),
			ensureContainer: vi.fn(),
			listTemplates: vi.fn(),
			listFiles: vi.fn(),
			copyTemplate: vi.fn(),
			updateFile: vi.fn().mockResolvedValue({ ...file, contentManaged: true }),
		};
		const service = new ReconcileAssetFile(
			{ render: (template) => template },
			repository,
			f.service,
		);

		// Act
		const result = await service.execute({
			container: {
				id: "folder",
				url: "https://example.test/folder",
				name: "Meetup",
				eventId: "event",
			},
			template: {
				id: f.input.templateId,
				name: "Slides",
				kind: "slides",
				mimeType: f.input.mimeType,
				contentContract: f.input.contract,
			},
			currentFiles: [file],
			date: "2099-01-01",
			mode: "check",
			diagnostics: [],
			model: f.input.model,
			recovery: { [file.id]: { operation: "enroll", revision: "revision-1" } },
		});

		// Assert
		expect(result).toEqual({ file, status: "pending" });
		expect(repository.copyTemplate).not.toHaveBeenCalled();
		expect(repository.updateFile).not.toHaveBeenCalled();
		expect(execute).not.toHaveBeenCalled();
	});
	it.each([
		{ stage: "preflight", technical: true },
		{ stage: "execute", technical: true },
		{ stage: "preflight", technical: false },
		{ stage: "execute", technical: false },
	] as const)(
		"preserves technical=$technical for $stage failures",
		async ({ stage, technical }) => {
			// Arrange
			const f = contentFixture();
			const error = technical
				? new Error("Synthetic renderer transport failure")
				: new ContentError("conflict");
			vi.spyOn(f.service, "preflight").mockResolvedValue(undefined);
			vi.spyOn(f.service, "execute").mockResolvedValue({
				status: "ready",
				fallback: false,
			});
			vi.spyOn(f.service, stage).mockRejectedValueOnce(error);
			const file = {
				id: f.input.fileId,
				name: "Slides",
				templateId: f.input.templateId,
				kind: "slides",
				mimeType: f.input.mimeType,
				contentManaged: true,
			};
			const repository: AssetRepository = {
				findContainer: vi.fn(),
				ensureContainer: vi.fn(),
				listTemplates: vi.fn(),
				listFiles: vi.fn(),
				copyTemplate: vi.fn().mockResolvedValue(file),
				updateFile: vi.fn().mockResolvedValue(file),
			};
			const diagnostics: PublicationDiagnostic[] = [];
			const service = new ReconcileAssetFile(
				{ render: (template) => template },
				repository,
				f.service,
			);
			let result:
				| Awaited<ReturnType<ReconcileAssetFile["execute"]>>
				| undefined;
			let failure: unknown;

			// Act
			try {
				result = await service.execute({
					container: {
						id: "folder",
						url: "https://example.test/folder",
						name: "Meetup",
						eventId: "event",
					},
					template: {
						id: f.input.templateId,
						name: "Slides",
						kind: "slides",
						mimeType: f.input.mimeType,
						contentContract: f.input.contract,
					},
					currentFiles: stage === "execute" ? [file] : [],
					date: "2026-11-15",
					mode: "fix",
					diagnostics,
					model: f.input.model,
				});
			} catch (caught) {
				failure = caught;
			}

			// Assert
			if (technical) {
				expect(failure).toBe(error);
				expect(result).toBeUndefined();
				expect(diagnostics).toEqual([]);
			} else {
				expect(failure).toBeUndefined();
				expect(result?.status).toBe("conflict");
				expect(diagnostics).toContainEqual(
					expect.objectContaining({
						code: "publication.assets.content.conflict",
					}),
				);
			}
			expect(repository.copyTemplate).not.toHaveBeenCalled();
			expect(repository.updateFile).not.toHaveBeenCalled();
		},
	);
});
