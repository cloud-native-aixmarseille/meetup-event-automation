import { describe, expect, it, vi } from "vitest";
import type { GoogleDriveClient } from "./google-drive-asset-repository-contracts.js";
import { GoogleDrivePublicAssetFolder } from "./google-drive-public-asset-folder.js";

function fixture(name: "slides" | "tmp-covers") {
	const child = {
		id: "child",
		name,
		mimeType: "application/vnd.google-apps.folder",
		parents: ["root"],
	};
	const files = {
		get: vi.fn().mockResolvedValue({
			data: {
				id: "root",
				name: "Any root name",
				mimeType: "application/vnd.google-apps.folder",
			},
		}),
		list: vi.fn().mockResolvedValue({ data: { files: [child] } }),
		create: vi.fn(),
		update: vi.fn(),
	};
	const folder = new GoogleDrivePublicAssetFolder(
		{ files } as unknown as GoogleDriveClient,
		"root",
		name,
	);
	return { folder, files, child };
}

describe("public asset subfolders", () => {
	it.each(["slides", "tmp-covers"] as const)(
		"resolves the unique %s child using the configured root ID",
		async (name) => {
			// Arrange
			const f = fixture(name);

			// Act
			const id = await f.folder.resolve();

			// Assert
			expect(id).toBe("child");
			expect(f.files.list).toHaveBeenCalledWith(
				expect.objectContaining({
					q: `'root' in parents and name='${name}' and trashed=false`,
					supportsAllDrives: true,
					includeItemsFromAllDrives: true,
				}),
				{ retry: false, timeout: 30_000 },
			);
			expect(f.files.create).not.toHaveBeenCalled();
			expect(f.files.update).not.toHaveBeenCalled();
		},
	);
	it.each(["missing", "duplicate", "paginated", "incomplete", "malformed"])(
		"rejects %s folder searches without writing",
		async (scenario) => {
			// Arrange
			const f = fixture("slides");
			const data =
				scenario === "missing"
					? { files: [] }
					: scenario === "duplicate"
						? { files: [f.child, { ...f.child, id: "duplicate" }] }
						: scenario === "paginated"
							? { files: [f.child], nextPageToken: "more" }
							: scenario === "incomplete"
								? { files: [f.child], incompleteSearch: true }
								: { files: {} };
			f.files.list.mockResolvedValue({ data });

			// Act
			const result = f.folder.resolve();

			// Assert
			await expect(result).rejects.toThrow("missing or ambiguous");
			expect(f.files.create).not.toHaveBeenCalled();
		},
	);
	it.each([
		{ id: "root" },
		{ id: "unsafe'id" },
		{ name: "other" },
		{ mimeType: "application/pdf" },
		{ trashed: true },
		{ parents: ["other"] },
		{ parents: ["root", "other"] },
	])("rejects mismatched child metadata %#", async (patch) => {
		// Arrange
		const f = fixture("tmp-covers");
		f.files.list.mockResolvedValue({
			data: { files: [{ ...f.child, ...patch }] },
		});

		// Act
		const result = f.folder.resolve();

		// Assert
		await expect(result).rejects.toThrow("Invalid public asset folder");
	});
	it.each([
		{ id: "other" },
		{ mimeType: "application/pdf" },
		{ trashed: true },
	])("rejects invalid root metadata %# before child lookup", async (patch) => {
		// Arrange
		const f = fixture("slides");
		f.files.get.mockResolvedValue({
			data: {
				id: "root",
				mimeType: "application/vnd.google-apps.folder",
				...patch,
			},
		});

		// Act
		const result = f.folder.resolve();

		// Assert
		await expect(result).rejects.toThrow("Invalid public root folder");
		expect(f.files.list).not.toHaveBeenCalled();
	});
});
