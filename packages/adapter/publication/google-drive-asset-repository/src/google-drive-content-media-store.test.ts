import type { drive_v3 } from "@googleapis/drive";
import { describe, expect, it, vi } from "vitest";
import { DriveContentImage } from "./drive-content-image.js";
import { DrivePublicFolderError } from "./drive-public-folder-error.js";
import { GoogleDriveContentMediaStore } from "./google-drive-content-media-store.js";

describe("immutable content media", () => {
	it.each(["metadata-version", "bytes", "description", "private", "moved"])(
		"verifies a saved cover after a change to %s",
		async (change) => {
			// Arrange
			const bytes = Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
				"base64",
			);
			const inspector = new DriveContentImage();
			const media = {
				...inspector.inspect({ bytes, mimeType: "image/png" }),
				mimeType: "image/png" as const,
				id: "saved-cover",
				url: "https://drive.google.com/uc?export=download&id=saved-cover",
				description: "Reviewed artwork",
				sourceRevision: "1",
			};
			const currentBytes =
				change === "bytes" ? Buffer.concat([bytes, Buffer.from([0])]) : bytes;
			const get = vi.fn(async (input: { alt?: string }) =>
				input.alt
					? { data: "image-stream" }
					: {
							status: 200,
							data: {
								id: media.id,
								mimeType: media.mimeType,
								description:
									change === "description" ? "Changed" : media.description,
								parents: [
									change === "moved" ? "other-folder" : "covers-folder",
								],
								version: "2",
								appProperties: {
									contentSchema: "1",
									contentHash: inspector.inspect({
										bytes: currentBytes,
										mimeType: "image/png",
									}).fingerprint,
								},
							},
						},
			);
			const list = vi.fn(async () => ({
				data: {
					permissions:
						change === "private" ? [] : [{ type: "anyone", role: "reader" }],
				},
			}));
			const store = new GoogleDriveContentMediaStore(
				{ files: { get }, permissions: { list } } as unknown as drive_v3.Drive,
				{ resolve: async () => "covers-folder" },
				inspector,
				{ read: async () => currentBytes },
				{ verify: vi.fn() },
			);
			// Act
			const verified = await store.verify(media);
			// Assert
			expect(verified).toBe(change === "metadata-version");
		},
	);
	it("rejects invalid destination layout before reserving an image identity", async () => {
		// Arrange
		const generateIds = vi.fn();
		const store = new GoogleDriveContentMediaStore(
			{ files: { generateIds } } as unknown as drive_v3.Drive,
			{
				resolve: async () => {
					throw new DrivePublicFolderError("Missing cover folder");
				},
			},
			new DriveContentImage(),
			{ read: vi.fn() },
			{ verify: vi.fn() },
		);
		// Act
		const result = store.reserve();
		// Assert
		await expect(result).rejects.toThrow(DrivePublicFolderError);
		expect(generateIds).not.toHaveBeenCalled();
	});
	it.each(["public-root", "slides-folder"])(
		"rejects a cover in %s before downloading it",
		async (parent) => {
			// Arrange
			const get = vi.fn(async () => ({ data: { parents: [parent] } }));
			const read = vi.fn();
			const store = new GoogleDriveContentMediaStore(
				{ files: { get } } as unknown as drive_v3.Drive,
				{ resolve: async () => "covers-folder" },
				new DriveContentImage(),
				{ read },
				{ verify: vi.fn() },
			);
			// Act
			const result = store.read("reserved");
			// Assert
			await expect(result).rejects.toThrow("verified public artifact");
			expect(get).toHaveBeenCalledTimes(1);
			expect(read).not.toHaveBeenCalled();
		},
	);
	it.each([
		"paginated-reader",
		"restricted",
		"writer",
		"incomplete",
		"malformed",
		"unavailable",
	])(
		"verifies %s permissions independently of shared-drive file metadata",
		async (scenario) => {
			// Arrange
			const image = {
				bytes: Buffer.from(
					"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
					"base64",
				),
				mimeType: "image/png" as const,
			};
			const inspector = new DriveContentImage();
			const list = vi.fn().mockResolvedValue({ data: { permissions: [] } });
			if (scenario === "paginated-reader")
				list
					.mockResolvedValueOnce({
						data: { permissions: [], nextPageToken: "second" },
					})
					.mockResolvedValueOnce({
						data: { permissions: [{ type: "anyone", role: "reader" }] },
					});
			if (scenario === "writer")
				list.mockResolvedValue({
					data: { permissions: [{ type: "anyone", role: "writer" }] },
				});
			if (scenario === "incomplete")
				list.mockResolvedValue({
					data: {
						permissions: [{ type: "anyone", role: "reader" }],
						nextPageToken: "repeated",
					},
				});
			if (scenario === "malformed") list.mockResolvedValue({ data: {} });
			if (scenario === "unavailable")
				list.mockRejectedValue(new Error("Service unavailable"));
			const get = vi.fn(async (input: { alt?: string }) =>
				input.alt
					? { data: "image-stream" }
					: {
							status: 200,
							data: {
								id: "reserved",
								mimeType: image.mimeType,
								description: "Cover",
								parents: ["covers-folder"],
								version: "1",
								appProperties: {
									contentSchema: "1",
									contentHash: inspector.inspect(image).fingerprint,
								},
							},
						},
			);
			const read = vi.fn(async () => image.bytes);
			const store = new GoogleDriveContentMediaStore(
				{ files: { get }, permissions: { list } } as unknown as drive_v3.Drive,
				{ resolve: async () => "covers-folder" },
				inspector,
				{ read },
				{ verify: vi.fn() },
			);

			// Act
			const result = store.read("reserved");

			// Assert
			if (scenario === "paginated-reader") {
				await expect(result).resolves.toMatchObject({
					id: "reserved",
					fingerprint: inspector.inspect(image).fingerprint,
				});
				expect(list).toHaveBeenCalledTimes(2);
				expect(list).toHaveBeenLastCalledWith(
					expect.objectContaining({
						fileId: "reserved",
						pageToken: "second",
						supportsAllDrives: true,
					}),
					expect.objectContaining({ retry: false }),
				);
			} else await expect(result).rejects.toThrow();
			expect(read).toHaveBeenCalledTimes(
				scenario === "paginated-reader" ? 1 : 0,
			);
		},
	);
	it.each(["same", "changed", "new"])(
		"handles %s bytes without overwriting a stable identity",
		async (scenario) => {
			// Arrange
			const image = {
				bytes: Buffer.from(
					"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
					"base64",
				),
				mimeType: "image/png" as const,
			};
			const inspector = new DriveContentImage();
			const properties = {
				contentSchema: "1",
				contentHash:
					scenario === "changed"
						? "a".repeat(64)
						: inspector.inspect(image).fingerprint,
			};
			const metadata = {
				status: 200,
				data: {
					id: "reserved",
					mimeType: image.mimeType,
					description: "Public cover",
					parents: ["covers-folder"],
					version: "1",
					appProperties: properties,
				},
			};
			let created = false;
			const create = vi.fn(async () => {
				created = true;
				return { data: { id: "reserved" } };
			});
			const get = vi.fn(async (input: { alt?: string }) =>
				input.alt
					? { data: "stream" }
					: scenario === "new" && !created
						? { status: 404 }
						: metadata,
			);
			const list = vi.fn(async () => ({
				data: { permissions: [{ type: "anyone", role: "reader" }] },
			}));
			const client = {
				files: { get, create },
				permissions: { list },
			} as unknown as drive_v3.Drive;
			const store = new GoogleDriveContentMediaStore(
				client,
				{ resolve: async () => "covers-folder" },
				inspector,
				{ read: vi.fn(async () => image.bytes) },
				{ verify: vi.fn() },
			);
			// Act
			const result = store.persist("reserved", image, "Public cover");
			// Assert
			if (scenario === "changed")
				await expect(result).rejects.toThrow("changed");
			else
				await expect(result).resolves.toMatchObject({
					id: "reserved",
					width: 1,
					height: 1,
					fingerprint: inspector.inspect(image).fingerprint,
				});
			expect(create).toHaveBeenCalledTimes(scenario === "new" ? 1 : 0);
			expect(list).toHaveBeenCalledWith(
				expect.objectContaining({
					fileId: "reserved",
					supportsAllDrives: true,
				}),
				expect.objectContaining({ retry: false }),
			);
			if (scenario === "new")
				expect(create).toHaveBeenCalledWith(
					expect.objectContaining({
						requestBody: expect.objectContaining({
							id: "reserved",
							parents: ["covers-folder"],
						}),
					}),
					expect.objectContaining({ retry: false }),
				);
		},
	);
	it("treats a changed artifact as stale while retaining transport failures", async () => {
		// Arrange
		const get = vi
			.fn()
			.mockResolvedValueOnce({ data: { trashed: true } })
			.mockRejectedValue(new Error("Service unavailable"));
		const store = new GoogleDriveContentMediaStore(
			{ files: { get } } as unknown as drive_v3.Drive,
			{ resolve: async () => "covers-folder" },
			new DriveContentImage(),
			{ read: vi.fn() },
			{ verify: vi.fn() },
		);
		const media = {
			id: "reserved",
			url: "https://images.example.org/image.png",
			fingerprint: "a".repeat(64),
			sourceRevision: "1",
			description: "Public cover",
			mimeType: "image/png" as const,
			width: 1,
			height: 1,
		};
		// Act
		const stale = await store.verify(media);
		const unavailable = store.verify(media);
		// Assert
		expect(stale).toBe(false);
		await expect(unavailable).rejects.toThrow("Service unavailable");
	});
});
