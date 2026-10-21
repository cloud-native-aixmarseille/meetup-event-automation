import { Readable } from "node:stream";
import type { ContentManifest } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import type { GoogleDriveClient } from "./google-drive-asset-repository-contracts.js";
import { GoogleDriveManifestRepository } from "./google-drive-manifest-repository.js";

const manifest: ContentManifest = {
	version: 1,
	fileId: "file",
	templateId: "template",
	mimeType: "application/vnd.google-apps.presentation",
	contract: {
		version: 1,
		revision: "one",
		kind: "slides",
		fields: [{ type: "text", token: "event.title", required: true }],
	},
	bindings: [],
};

describe("Drive binding sidecars", () => {
	it("creates sidecars in the same folder without modifying sharing", async () => {
		// Arrange
		const files = {
			list: vi.fn(async () => ({ data: { files: [] } })),
			create: vi.fn(),
			update: vi.fn(),
		};
		const repository = new GoogleDriveManifestRepository({
			files,
		} as unknown as GoogleDriveClient);

		// Act
		await repository.save("folder", manifest);

		// Assert
		expect(files.create).toHaveBeenCalledWith(
			expect.objectContaining({
				requestBody: {
					name: ".file.bindings.json",
					mimeType: "application/json",
					parents: ["folder"],
					appProperties: { meetup_binding_file: "file" },
				},
			}),
			{ retry: false, timeout: 30_000 },
		);
		expect(files.update).not.toHaveBeenCalled();
	});

	it("loads a unique sidecar only from its associated folder", async () => {
		// Arrange
		const files = {
			list: vi.fn(async () => ({
				data: {
					files: [
						{
							id: "state",
							mimeType: "application/json",
							parents: ["folder"],
							appProperties: { meetup_binding_file: "file" },
						},
					],
				},
			})),
			get: vi.fn(async () => ({
				data: Readable.from([JSON.stringify(manifest)]),
			})),
		};
		const repository = new GoogleDriveManifestRepository({
			files,
		} as unknown as GoogleDriveClient);

		// Act
		const result = await repository.load("folder", "file");

		// Assert
		expect(result).toEqual(manifest);
		expect(files.get).toHaveBeenCalledWith(
			{ fileId: "state", alt: "media", supportsAllDrives: true },
			{ retry: false, timeout: 30_000, responseType: "stream" },
		);
	});

	it("stops on duplicate sidecars after an ambiguous creation", async () => {
		// Arrange
		const files = {
			list: vi.fn(async () => ({
				data: { files: [{ id: "one" }, { id: "two" }] },
			})),
			get: vi.fn(),
			create: vi.fn(),
		};
		const repository = new GoogleDriveManifestRepository({
			files,
		} as unknown as GoogleDriveClient);

		// Act
		const result = repository.load("folder", "file");

		// Assert
		await expect(result).rejects.toMatchObject({ code: "recovery" });
		expect(files.get).not.toHaveBeenCalled();
		expect(files.create).not.toHaveBeenCalled();
	});
});
