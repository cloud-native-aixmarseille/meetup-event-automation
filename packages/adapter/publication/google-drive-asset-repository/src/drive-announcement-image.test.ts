import {
	ContentMediaChangedError,
	PublicationDomainComposition,
} from "@meetup-automation/publication";
import {
	TemplateRenderer,
	TemplatingComposition,
} from "@meetup-automation/templating";
import { describe, expect, it, vi } from "vitest";
import { DriveAnnouncementImage } from "./drive-announcement-image.js";
import { DriveContentImage } from "./drive-content-image.js";
import type {
	DriveFile,
	GoogleDriveClient,
} from "./google-drive-asset-repository-contracts.js";

describe("announcement image source verification", () => {
	it("checks the template's date pattern with the injected locale formatter", async () => {
		// Arrange
		const f = fixture();
		f.template.name = "Community [EVENT_DATE:D MMMM YYYY]";
		f.source.name = "Community 12 avril 2027";
		f.format.mockReturnValue("12 avril 2027");

		// Act
		const media = await f.announcement.read("2027-04-12", f.exported);

		// Assert
		expect(media.source?.id).toBe(f.source.id);
		expect(f.format).toHaveBeenCalledExactlyOnceWith(
			"2027-04-12",
			"D MMMM YYYY",
		);
	});
	it.each([
		["Community [EVENT_DATE:YYYY-MM-DD]", "Community 2027-04-12"],
		["[EVENT_DATE:YYYY-MM-DD] - Rencontre", "2027-04-12 - Rencontre"],
		["Community announcement", "Community announcement"],
	])(
		"accepts the managed copy named by template %s",
		async (templateName, copyName) => {
			// Arrange
			const f = fixture();
			f.template.name = templateName;
			f.source.name = copyName;

			// Act
			const media = await f.announcement.read("2027-04-12", f.exported);

			// Assert
			expect(media).toMatchObject({
				id: "announcement-announcement-copy",
				source: { id: "announcement-copy", revision: "17" },
				url: f.exported.url,
				width: 1,
				height: 1,
			});
			expect(media.fingerprint).toMatch(/^[a-f0-9]{64}$/);
			expect(f.get).toHaveBeenCalledWith(
				expect.objectContaining({
					fileId: "announcement-template",
					supportsAllDrives: true,
				}),
				expect.objectContaining({ retry: false }),
			);
			expect(f.loader.load).toHaveBeenCalledExactlyOnceWith(f.exported.url);
		},
	);

	it("rejects a copy named for another event before downloading its image", async () => {
		// Arrange
		const f = fixture();
		f.source.name = "Community 2027-04-13";

		// Act
		const result = f.announcement.read("2027-04-12", f.exported);

		// Assert
		await expect(result).rejects.toThrow("belongs to another event");
		expect(f.loader.load).not.toHaveBeenCalled();
	});

	it.each([undefined, "", "../invalid"])(
		"rejects missing or invalid template identity %s",
		async (templateId) => {
			// Arrange
			const f = fixture();
			const properties = { ...f.source.appProperties };
			delete properties.template_file_id;
			if (templateId !== undefined) properties.template_file_id = templateId;
			f.source.appProperties = properties;

			// Act
			const result = f.announcement.read("2027-04-12", f.exported);

			// Assert
			await expect(result).rejects.toThrow(ContentMediaChangedError);
			expect(f.get).toHaveBeenCalledTimes(1);
			expect(f.loader.load).not.toHaveBeenCalled();
		},
	);

	it.each([
		{ id: "another-template" },
		{ trashed: true },
		{ name: " " },
		{ name: null },
		{ mimeType: "image/png" },
		{ appProperties: { template_kind: "slides" } },
	])("rejects invalid announcement template metadata %j", async (change) => {
		// Arrange
		const f = fixture();
		Object.assign(f.template, change);

		// Act
		const result = f.announcement.read("2027-04-12", f.exported);

		// Assert
		await expect(result).rejects.toThrow(ContentMediaChangedError);
		expect(f.loader.load).not.toHaveBeenCalled();
	});

	it.each([
		{ version: "18" },
		{ trashed: true },
		{ mimeType: "image/png" },
		{ appProperties: { template_kind: "slides", meetup_content: "v1" } },
		{ appProperties: { template_kind: "announcement" } },
	])("rejects changed or unmanaged source metadata %j", async (change) => {
		// Arrange
		const f = fixture();
		Object.assign(f.source, change);

		// Act
		const result = f.announcement.read("2027-04-12", f.exported);

		// Assert
		await expect(result).rejects.toThrow(ContentMediaChangedError);
		expect(f.loader.load).not.toHaveBeenCalled();
	});

	it("preserves template transport failures before downloading the image", async () => {
		// Arrange
		const f = fixture();
		const error = new Error("Synthetic template transport failure");
		f.get
			.mockResolvedValueOnce({ data: f.source })
			.mockRejectedValueOnce(error);

		// Act
		const result = f.announcement.read("2027-04-12", f.exported);

		// Assert
		await expect(result).rejects.toBe(error);
		expect(f.loader.load).not.toHaveBeenCalled();
	});
});

function fixture() {
	const source: DriveFile = {
		id: "announcement-copy",
		name: "Community 2027-04-12",
		version: "17",
		mimeType: "application/vnd.google-apps.presentation",
		appProperties: {
			template_kind: "announcement",
			template_file_id: "announcement-template",
			meetup_content: "v1",
		},
	};
	const template: DriveFile = {
		id: "announcement-template",
		name: "Community [EVENT_DATE:YYYY-MM-DD]",
		mimeType: "application/vnd.google-apps.presentation",
		appProperties: { template_kind: "announcement" },
	};
	const get = vi.fn(async ({ fileId }: { fileId: string }) => {
		if (fileId === "announcement-copy") return { data: source };
		if (fileId === "announcement-template") return { data: template };
		throw new Error("Unexpected Drive file");
	});
	const loader = {
		load: vi.fn(async () => ({
			bytes: Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
				"base64",
			),
			mimeType: "image/png" as const,
		})),
	};
	const format = vi.fn((date: string) => date);
	const announcement = new DriveAnnouncementImage(
		{ files: { get } } as unknown as GoogleDriveClient,
		loader,
		new DriveContentImage(),
		new PublicationDomainComposition().assetFileName(
			new TemplateRenderer(new TemplatingComposition().parser(), { format }),
		),
	);
	return {
		source,
		template,
		get,
		loader,
		announcement,
		format,
		exported: {
			sourceId: "announcement-copy",
			sourceRevision: "17",
			url: "https://images.example.org/announcement.png",
			description: "Community event announcement",
		},
	};
}
