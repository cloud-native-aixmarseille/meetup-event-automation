import { describe, expect, it, vi } from "vitest";
import { DriveContentImage } from "./drive-content-image.js";
import type { GoogleDriveClient } from "./google-drive-asset-repository-contracts.js";
import { GoogleDriveContentMediaStore } from "./google-drive-content-media-store.js";

describe("immutable content media", () => {
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
					parents: ["public-folder"],
					version: "1",
					appProperties: properties,
					permissions: [{ type: "anyone", role: "reader" }],
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
			const client = { files: { get, create } } as unknown as GoogleDriveClient;
			const store = new GoogleDriveContentMediaStore(
				client,
				"public-folder",
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
			if (scenario === "new")
				expect(create).toHaveBeenCalledWith(
					expect.objectContaining({
						requestBody: expect.objectContaining({
							id: "reserved",
							parents: ["public-folder"],
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
			{ files: { get } } as unknown as GoogleDriveClient,
			"public-folder",
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
