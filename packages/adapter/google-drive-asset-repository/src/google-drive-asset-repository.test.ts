import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { GoogleDriveAssetRepository } from "./google-drive-asset-repository.js";
import type { GoogleDriveClient } from "./google-drive-asset-repository-contracts.js";

const options = { parentFolderId: "parent", templateFolderId: "templates" };

const request = {
	eventId: "community/meetups#42",
	title: "2026-09-30 - September - Example Host",
	idempotencyKey: "community/meetups#42:assets:v1",
};

const eventKey = createHash("sha256")
	.update(request.idempotencyKey)
	.digest("hex");

const folder = {
	id: "folder-1",
	name: request.title,
	mimeType: "application/vnd.google-apps.folder",
	parents: [options.parentFolderId],
	appProperties: { meetup_event_key: eventKey },
};

const template = { id: "template-1", name: "Slides", kind: "slides" };

const file = {
	id: "file-1",
	name: "Slides",
	webViewLink: "https://docs.google.com/presentation/d/file-1",
	appProperties: {
		template_file_id: template.id,
		template_kind: template.kind,
	},
};

function setup() {
	const files = {
		list: vi.fn().mockResolvedValue({ data: { files: [] } }),
		create: vi.fn().mockResolvedValue({ data: folder }),
		update: vi.fn().mockResolvedValue({ data: folder }),
		copy: vi.fn().mockResolvedValue({ data: file }),
	};
	const repository = new GoogleDriveAssetRepository(
		{ files } as unknown as GoogleDriveClient,
		options,
	);
	return { files, repository };
}

describe("Google Drive asset repository", () => {
	it("paginates all template files including empty pages", async () => {
		// Arrange
		const { files, repository } = setup();
		files.list
			.mockResolvedValueOnce({ data: { files: [], nextPageToken: "page-2" } })
			.mockResolvedValueOnce({
				data: { files: [{ ...file, id: template.id }] },
			});

		// Act
		const actual = await repository.listTemplates();

		// Assert
		expect(actual).toEqual([{ ...template }]);
		expect(files.list.mock.calls[1][0]).toMatchObject({
			pageToken: "page-2",
			supportsAllDrives: true,
			includeItemsFromAllDrives: true,
		});
	});

	it("looks up stable event metadata and returns vendor-independent values", async () => {
		// Arrange
		const { files, repository } = setup();
		files.list.mockResolvedValue({ data: { files: [folder] } });

		// Act
		const container = await repository.findContainer(request);
		await repository.ensureContainer(request);

		// Assert
		expect(container).toEqual({
			id: folder.id,
			name: folder.name,
			url: "https://drive.google.com/drive/folders/folder-1",
			eventId: request.eventId,
		});
		expect(files.list.mock.calls[0][0].q).toContain(eventKey);
		expect(files.list.mock.calls[0][0].q).toContain("'parent' in parents");
		expect(files.update).not.toHaveBeenCalled();
		expect(files.create).not.toHaveBeenCalled();
	});

	it("creates a tagged folder and disables automatic replay of writes", async () => {
		// Arrange
		const { files, repository } = setup();

		// Act
		await repository.ensureContainer(request);

		// Assert
		expect(files.create).toHaveBeenCalledWith(
			expect.objectContaining({
				requestBody: {
					name: request.title,
					mimeType: folder.mimeType,
					parents: ["parent"],
					appProperties: folder.appProperties,
				},
				supportsAllDrives: true,
			}),
			expect.objectContaining({ retry: false }),
		);
	});

	it("renames a folder identified by the event key without creating another", async () => {
		// Arrange
		const { files, repository } = setup();
		files.list.mockResolvedValue({
			data: {
				files: [{ ...folder, name: "Previous name" }],
			},
		});

		// Act
		await repository.ensureContainer(request);

		// Assert
		expect(files.update).toHaveBeenCalledWith(
			expect.objectContaining({
				fileId: folder.id,
				requestBody: {
					name: request.title,
					appProperties: folder.appProperties,
				},
			}),
			expect.anything(),
		);
		expect(files.create).not.toHaveBeenCalled();
	});

	it.each([
		{ parents: ["outside-parent"] },
		{ mimeType: "application/pdf" },
		{ trashed: true },
		{ appProperties: { meetup_event_key: "another-event" } },
		{ appProperties: {} },
		{ appProperties: undefined },
	])(
		"rejects folders that do not match the requested event and parent: %j",
		async (override) => {
			// Arrange
			const { files, repository } = setup();
			files.list.mockResolvedValue({
				data: { files: [{ ...folder, ...override }] },
			});

			// Act
			const operation = repository.ensureContainer(request);

			// Assert
			await expect(operation).rejects.toThrow(
				"does not match the requested event and configured parent",
			);
			expect(files.create).not.toHaveBeenCalled();
			expect(files.update).not.toHaveBeenCalled();
		},
	);

	it("keeps event keys distinct across repositories with the same issue number", async () => {
		// Arrange
		const { files, repository } = setup();
		await repository.findContainer(request);

		// Act
		await repository.findContainer({
			...request,
			eventId: "another/meetups#42",
			idempotencyKey: "another/meetups#42:assets:v1",
		});

		// Assert
		expect(files.list.mock.calls[0][0].q).not.toBe(
			files.list.mock.calls[1][0].q,
		);
	});

	it("rejects duplicate folders instead of selecting the first result", async () => {
		// Arrange
		const { files, repository } = setup();
		files.list.mockResolvedValue({
			data: { files: [folder, { ...folder, id: "duplicate" }] },
		});

		// Act
		const operation = repository.ensureContainer(request);

		// Assert
		await expect(operation).rejects.toThrow("Multiple asset folders");
		expect(files.update).not.toHaveBeenCalled();
	});

	it("copies templates and updates their names and metadata", async () => {
		// Arrange
		const { files, repository } = setup();
		files.update.mockResolvedValue({ data: file });

		// Act
		const copy = await repository.copyTemplate(folder.id, template, file.name);
		await repository.updateFile(copy, template, "Updated slides");

		// Assert
		expect(copy).toEqual({
			id: file.id,
			name: file.name,
			url: file.webViewLink,
			templateId: template.id,
			kind: template.kind,
		});
		expect(files.copy).toHaveBeenCalledWith(
			expect.objectContaining({
				fileId: template.id,
				requestBody: {
					name: file.name,
					parents: [folder.id],
					appProperties: file.appProperties,
				},
				supportsAllDrives: true,
			}),
			expect.objectContaining({ retry: false }),
		);
		expect(files.update.mock.calls[0][0].requestBody).toEqual({
			name: "Updated slides",
			appProperties: file.appProperties,
		});
	});

	it("escapes search terms and tolerates absent optional file metadata", async () => {
		// Arrange
		const { files, repository } = setup();
		files.list.mockResolvedValue({
			data: { files: [{ id: "file", name: "Name" }] },
		});

		// Act
		const actual = await repository.listFiles("folder'\\id");

		// Assert
		expect(actual).toEqual([
			{ id: "file", name: "Name", kind: undefined, templateId: undefined },
		]);
		expect(files.list.mock.calls[0][0].q).toContain(
			"'folder\\'\\\\id' in parents",
		);
	});

	it.each([{ incompleteSearch: true }, { nextPageToken: "repeated" }])(
		"rejects incomplete or looping paginated responses: %j",
		async (data) => {
			// Arrange
			const { files, repository } = setup();
			files.list.mockResolvedValue({ data });

			// Act
			const operation = repository.listFiles("folder");

			// Assert
			await expect(operation).rejects.toThrow(
				/incomplete search|repeated pagination/,
			);
		},
	);

	it.each([
		{},
		{ id: "file" },
		{ id: "file", name: "Name" },
		{ ...file, mimeType: folder.mimeType },
	])("rejects malformed templates: %j", async (badFile) => {
		// Arrange
		const { files, repository } = setup();
		files.list.mockResolvedValue({ data: { files: [badFile] } });

		// Act
		const operation = repository.listTemplates();

		// Assert
		await expect(operation).rejects.toThrow("Every asset template");
	});

	it("rejects a malformed file response", async () => {
		// Arrange
		const { files, repository } = setup();
		files.list.mockResolvedValueOnce({ data: { files: [{}] } });

		// Act
		const operation = repository.listFiles("folder");

		// Assert
		await expect(operation).rejects.toThrow("invalid asset file");
	});

	it("rejects a malformed folder response", async () => {
		// Arrange
		const { files, repository } = setup();
		files.create.mockResolvedValue({ data: {} });

		// Act
		const operation = repository.ensureContainer(request);

		// Assert
		await expect(operation).rejects.toThrow("invalid asset folder");
	});

	it.each([401, 403, 429, 500, undefined])(
		"redacts provider responses and does not retry HTTP %s",
		async (status) => {
			// Arrange
			const { files, repository } = setup();
			files.create.mockRejectedValue({
				response: { status, data: "private@example.test" },
				message: "secret-token",
			});

			// Act
			const operation = repository.ensureContainer(request);

			// Assert
			await expect(operation).rejects.toMatchObject({
				name: "GoogleDriveAssetRepositoryError",
				message: expect.not.stringMatching(/private@example.test|secret-token/),
			});
			expect(files.create).toHaveBeenCalledOnce();
		},
	);

	it.each(["not json", "null", "{}", '{"type":"external_account"}'])(
		"rejects unsupported credentials without exposing them: %s",
		(credentials) => {
			// Arrange
			// No additional setup is needed.

			// Act
			const act = () =>
				GoogleDriveAssetRepository.createGoogleDriveAssetRepository(
					credentials,
					options,
				);

			// Assert
			expect(act).toThrow("Invalid Google service-account credentials");
		},
	);

	it("constructs a service-account client without calling the provider", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const actual = GoogleDriveAssetRepository.createGoogleDriveAssetRepository(
			JSON.stringify({
				type: "service_account",
				client_email: "synthetic@example.test",
				private_key: "synthetic-key",
			}),
			options,
		);

		// Assert
		expect(actual).toBeInstanceOf(GoogleDriveAssetRepository);
	});

	it.each([
		{ parentFolderId: "", templateFolderId: "templates" },
		{ parentFolderId: "same", templateFolderId: "same" },
	])("validates folder configuration: %j", (invalidOptions) => {
		// Arrange
		// No additional setup is needed.

		// Act
		const act = () =>
			new GoogleDriveAssetRepository({} as GoogleDriveClient, invalidOptions);

		// Assert
		expect(act).toThrow("Distinct Google Drive");
	});
});
