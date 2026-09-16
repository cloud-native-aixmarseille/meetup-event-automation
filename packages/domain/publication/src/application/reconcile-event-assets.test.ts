import { describe, expect, it, vi } from "vitest";
import type { AssetRepository, AssetTemplate } from "./ports.js";
import { ReconcileEventAssets } from "./reconcile-event-assets.js";

const input = {
	eventId: "community/meetups#42",
	date: "2026-09-30",
	hostName: "Example Host",
	mode: "fix" as const,
};

const folder = {
	id: "folder-1",
	url: "https://drive.google.com/drive/folders/folder-1",
	name: "2026-09-30 - September - Example Host",
	eventId: input.eventId,
};

const template = {
	id: "template-1",
	name: "[EVENT_DATE:YYYY-MM-DD] - Slides",
	kind: "slides",
};

const file = {
	id: "file-1",
	name: "2026-09-30 - Slides",
	templateId: template.id,
	kind: "slides",
	url: "https://docs.google.com/presentation/d/file-1",
};

function setup() {
	const repository = {
		findContainer: vi
			.fn<AssetRepository["findContainer"]>()
			.mockResolvedValue(folder),
		ensureContainer: vi
			.fn<AssetRepository["ensureContainer"]>()
			.mockResolvedValue(folder),
		listTemplates: vi
			.fn<AssetRepository["listTemplates"]>()
			.mockResolvedValue([template]),
		listFiles: vi.fn<AssetRepository["listFiles"]>().mockResolvedValue([file]),
		copyTemplate: vi
			.fn<AssetRepository["copyTemplate"]>()
			.mockResolvedValue(file),
		updateFile: vi.fn<AssetRepository["updateFile"]>().mockResolvedValue(file),
	};
	return { repository, reconcile: new ReconcileEventAssets(repository) };
}

describe("event asset reconciliation", () => {
	it("creates the missing folder and template copies and returns typed links", async () => {
		// Arrange
		const { repository, reconcile } = setup();
		repository.findContainer.mockResolvedValue(undefined);
		repository.listFiles.mockResolvedValue([]);

		// Act
		const result = await reconcile.execute(input);
		const actual = result.diagnostics.every((item) => item.fixApplied);

		// Assert
		expect(repository.ensureContainer).toHaveBeenCalledWith(
			expect.objectContaining({
				title: folder.name,
				idempotencyKey: "community/meetups#42:assets:v1",
			}),
		);
		expect(repository.copyTemplate).toHaveBeenCalledWith(
			folder.id,
			template,
			file.name,
		);
		expect(result.files).toEqual({ "slides-link": file.url });
		expect(actual).toBe(true);
	});

	it("performs no writes when the existing folder and files already match", async () => {
		// Arrange
		const { repository, reconcile } = setup();

		// Act
		const result = await reconcile.execute({
			...input,
			existingUrl: folder.url,
		});

		// Assert
		expect(result.diagnostics).toEqual([]);
		expect(repository.ensureContainer).not.toHaveBeenCalled();
		expect(repository.copyTemplate).not.toHaveBeenCalled();
		expect(repository.updateFile).not.toHaveBeenCalled();
	});

	it("reports missing folders in check mode without any mutation", async () => {
		// Arrange
		const { repository, reconcile } = setup();
		repository.findContainer.mockResolvedValue(undefined);

		// Act
		const result = await reconcile.execute({ ...input, mode: "check" });

		// Assert
		expect(result.container).toBeUndefined();
		expect(result.diagnostics).toMatchObject([
			{ code: "publication.assets.container.drift", fixApplied: false },
		]);
		expect(repository.ensureContainer).not.toHaveBeenCalled();
		expect(repository.listFiles).not.toHaveBeenCalled();
	});

	it("checks folder, link, and file drift without writing", async () => {
		// Arrange
		const { repository, reconcile } = setup();
		repository.findContainer.mockResolvedValue({
			...folder,
			name: "Old folder",
		});
		repository.listFiles.mockResolvedValue([
			{ ...file, name: "Old slides", kind: undefined },
		]);

		// Act
		const result = await reconcile.execute({ ...input, mode: "check" });
		const actual = result.diagnostics.map(({ code }) => code);

		// Assert
		expect(actual).toEqual([
			"publication.assets.container.drift",
			"publication.assets.link.drift",
			"publication.assets.file.drift",
		]);
		expect(repository.ensureContainer).not.toHaveBeenCalled();
		expect(repository.updateFile).not.toHaveBeenCalled();
		expect(repository.copyTemplate).not.toHaveBeenCalled();
	});

	it("renames managed folders and updates copies identified by template ID", async () => {
		// Arrange
		const { repository, reconcile } = setup();
		repository.findContainer.mockResolvedValue({
			...folder,
			name: "Old name",
		});
		repository.listFiles.mockResolvedValue([
			{ ...file, name: "Previous slides name", kind: undefined },
		]);

		// Act
		await reconcile.execute(input);

		// Assert
		expect(repository.ensureContainer).toHaveBeenCalledOnce();
		expect(repository.updateFile).toHaveBeenCalledWith(
			expect.objectContaining({ id: file.id }),
			template,
			file.name,
		);
		expect(repository.copyTemplate).not.toHaveBeenCalled();
	});

	it("finds renamed copies by template ID and tolerates files without a URL", async () => {
		// Arrange
		const { repository, reconcile } = setup();
		repository.listFiles.mockResolvedValue([{ ...file, name: "Old name" }]);
		repository.updateFile.mockResolvedValue({ ...file, url: undefined });

		// Act
		const files = (await reconcile.execute(input)).files;

		// Assert
		expect(files).toEqual({});
		expect(repository.updateFile).toHaveBeenCalledOnce();
	});

	it.each(["", "invalid", "2026-02-30", "2026-13-01"])(
		"does not contact the asset repository for invalid date %s",
		async (date) => {
			// Arrange
			const { repository, reconcile } = setup();

			// Act
			const diagnosticCode = (await reconcile.execute({ ...input, date }))
				.diagnostics[0].code;

			// Assert
			expect(diagnosticCode).toBe("publication.assets.prerequisites");
			expect(repository.listTemplates).not.toHaveBeenCalled();
		},
	);

	it("does not list templates until the host is supplied", async () => {
		// Arrange
		const { repository, reconcile } = setup();

		// Act
		await reconcile.execute({ ...input, hostName: " " });

		// Assert
		expect(repository.listTemplates).not.toHaveBeenCalled();
	});

	it("uses civil date month names independently of runtime timezone", async () => {
		// Arrange
		const { repository, reconcile } = setup();
		repository.findContainer.mockResolvedValue(undefined);

		// Act
		await reconcile.execute({
			...input,
			date: "2026-03-01",
			hostName: " Example Host ",
		});

		// Assert
		expect(repository.ensureContainer).toHaveBeenCalledWith(
			expect.objectContaining({ title: "2026-03-01 - March - Example Host" }),
		);
	});

	it.each<readonly AssetTemplate[]>([
		[],
		[{ ...template, kind: "" }],
		[template, template],
		[template, { ...template, id: "template-2" }],
	])(
		"rejects invalid template catalogs before any mutation",
		async (...templates) => {
			// Arrange
			const { repository, reconcile } = setup();
			repository.listTemplates.mockResolvedValue(templates);

			// Act
			const operation = reconcile.execute(input);

			// Assert
			await expect(operation).rejects.toThrow("Asset templates");
			expect(repository.ensureContainer).not.toHaveBeenCalled();
		},
	);

	it("rejects multiple copies with the same template ID", async () => {
		// Arrange
		const { repository, reconcile } = setup();
		repository.listFiles.mockResolvedValue([
			file,
			{ ...file, id: "duplicate" },
		]);

		// Act
		const operation = reconcile.execute(input);

		// Assert
		await expect(operation).rejects.toThrow("Ambiguous");
		expect(repository.updateFile).not.toHaveBeenCalled();
		expect(repository.copyTemplate).not.toHaveBeenCalled();
	});

	it("creates a managed copy when untagged files share the expected filename", async () => {
		// Arrange
		const { repository, reconcile } = setup();
		repository.listFiles.mockResolvedValue([
			{ ...file, id: "unmanaged-1", templateId: undefined },
			{ ...file, id: "unmanaged-2", templateId: undefined },
		]);

		// Act
		await reconcile.execute(input);

		// Assert
		expect(repository.copyTemplate).toHaveBeenCalledWith(
			folder.id,
			template,
			file.name,
		);
		expect(repository.updateFile).not.toHaveBeenCalled();
	});

	it("uses the current issue link only to report projection drift", async () => {
		// Arrange
		const { repository, reconcile } = setup();
		repository.findContainer.mockResolvedValue(undefined);

		// Act
		await reconcile.execute({
			...input,
			existingUrl: "https://drive.google.com/drive/folders/unmanaged",
		});

		// Assert
		expect(repository.findContainer).toHaveBeenCalledWith({
			eventId: input.eventId,
			idempotencyKey: `${input.eventId}:assets:v1`,
			title: folder.name,
		});
		expect(repository.ensureContainer).toHaveBeenCalledOnce();
	});
});
