import {
	type AssetFileName,
	type ContentImageLoader,
	type ContentMedia,
	ContentMediaChangedError,
} from "@meetup-automation/publication";
import type { DriveContentImage } from "./drive-content-image.js";
import {
	type DriveFile,
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";

export interface AnnouncementExport {
	readonly sourceId: string;
	readonly sourceRevision: string;
	readonly url: string;
	readonly description: string;
}
export class DriveAnnouncementImage {
	constructor(
		private readonly client: GoogleDriveClient,
		private readonly loader: ContentImageLoader,
		private readonly images: Pick<DriveContentImage, "inspect">,
		private readonly names: Pick<AssetFileName, "render">,
	) {}
	async read(
		date: string,
		exported: AnnouncementExport,
	): Promise<ContentMedia> {
		const file = await this.source(exported.sourceId, exported.sourceRevision);
		if (file.name !== (await this.expectedName(file, date)))
			throw new ContentMediaChangedError(
				"Announcement export belongs to another event",
			);
		const image = await this.loader.load(exported.url);
		const inspected = this.images.inspect(image);
		return {
			id: `announcement-${exported.sourceId}`,
			url: exported.url,
			description: exported.description,
			...inspected,
			mimeType: image.mimeType,
			sourceRevision: exported.sourceRevision,
			source: { id: exported.sourceId, revision: exported.sourceRevision },
		};
	}
	async verify(media: ContentMedia): Promise<boolean> {
		if (!media.source || media.id !== `announcement-${media.source.id}`)
			return false;
		try {
			await this.source(media.source.id, media.source.revision);
		} catch (error) {
			if (error instanceof ContentMediaChangedError) return false;
			throw error;
		}
		const actual = this.images.inspect(await this.loader.load(media.url));
		return (
			actual.fingerprint === media.fingerprint &&
			actual.width === media.width &&
			actual.height === media.height &&
			actual.mimeType === media.mimeType
		);
	}
	private async expectedName(file: DriveFile, date: string): Promise<string> {
		const templateId = file.appProperties?.template_file_id;
		if (!templateId || !/^[\w-]+$/.test(templateId))
			throw new ContentMediaChangedError(
				"Announcement template identity is missing",
			);
		const { data } = await this.client.files.get(
			{
				fileId: templateId,
				supportsAllDrives: true,
				fields: "id,name,mimeType,trashed,appProperties",
			},
			requestOptions,
		);
		if (
			data.id !== templateId ||
			data.trashed ||
			typeof data.name !== "string" ||
			!data.name.trim() ||
			data.mimeType !== "application/vnd.google-apps.presentation" ||
			data.appProperties?.template_kind !== "announcement"
		)
			throw new ContentMediaChangedError(
				"Announcement template changed or is invalid",
			);
		return this.names.render(data.name, date);
	}
	private async source(id: string, revision: string) {
		if (!/^[\w-]+$/.test(id) || !/^\d+$/.test(revision))
			throw new Error("Invalid announcement source identity");
		const { data } = await this.client.files.get(
			{
				fileId: id,
				supportsAllDrives: true,
				fields: "id,name,mimeType,trashed,version,appProperties",
			},
			requestOptions,
		);
		if (
			data.trashed ||
			data.mimeType !== "application/vnd.google-apps.presentation" ||
			data.version !== revision ||
			data.appProperties?.template_kind !== "announcement" ||
			data.appProperties?.meetup_content !== "v1"
		)
			throw new ContentMediaChangedError(
				"Announcement source changed or is not managed",
			);
		return data;
	}
}
