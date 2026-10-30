import { Readable } from "node:stream";
import type { drive_v3 } from "@googleapis/drive";
import {
	type ContentImageBytes,
	type ContentMedia,
	ContentMediaChangedError,
	type ContentMediaStore,
} from "@meetup-automation/publication";
import type { DriveAnnouncementImage } from "./drive-announcement-image.js";
import type { DriveBoundedStream } from "./drive-bounded-stream.js";
import type { DriveContentImage } from "./drive-content-image.js";
import { requestOptions } from "./google-drive-asset-repository-contracts.js";
import type { GoogleDrivePublicAssetFolder } from "./google-drive-public-asset-folder.js";

/** Immutable public media in a dedicated folder; never writes existing asset sidecars. */
export class GoogleDriveContentMediaStore implements ContentMediaStore {
	constructor(
		private readonly client: Pick<drive_v3.Drive, "files" | "permissions">,
		private readonly folders: Pick<GoogleDrivePublicAssetFolder, "resolve">,
		private readonly image: Pick<DriveContentImage, "inspect">,
		private readonly stream: Pick<DriveBoundedStream, "read">,
		private readonly announcement: Pick<DriveAnnouncementImage, "verify">,
	) {}
	async reserve(): Promise<string> {
		await this.folders.resolve();
		const { data } = await this.client.files.generateIds(
			{ count: 1, space: "drive", type: "files" },
			requestOptions,
		);
		const id = data.ids?.[0];
		if (!id || !/^[\w-]+$/.test(id))
			throw new Error("Content media identity was not reserved");
		return id;
	}
	async persist(
		id: string,
		image: ContentImageBytes,
		description: string,
	): Promise<ContentMedia> {
		const expected = this.image.inspect(image);
		const folderId = await this.folders.resolve();
		const existing = await this.read(id);
		if (existing) {
			if (existing.fingerprint !== expected.fingerprint)
				throw new Error(
					"Content media identity already contains different bytes",
				);
			return existing;
		}
		await this.client.files.create(
			{
				supportsAllDrives: true,
				requestBody: {
					id,
					name: `${id}.${image.mimeType === "image/png" ? "png" : "jpg"}`,
					description,
					mimeType: image.mimeType,
					parents: [folderId],
					appProperties: {
						contentSchema: "1",
						contentHash: expected.fingerprint,
					},
				},
				media: { mimeType: image.mimeType, body: Readable.from([image.bytes]) },
				fields: "id",
			},
			requestOptions,
		);
		const result = await this.read(id);
		if (!result || result.fingerprint !== expected.fingerprint)
			throw new Error("Content media write could not be verified");
		return result;
	}
	async read(id: string): Promise<ContentMedia | undefined> {
		if (!/^[\w-]+$/.test(id)) throw new Error("Invalid content media identity");
		const metadata = await this.client.files.get(
			{
				fileId: id,
				supportsAllDrives: true,
				fields: "id,mimeType,description,parents,trashed,version,appProperties",
			},
			{
				...requestOptions,
				validateStatus: (status) => status === 200 || status === 404,
			},
		);
		if (metadata.status === 404) return undefined;
		const file = metadata.data;
		if (
			file.trashed ||
			file.parents?.length !== 1 ||
			file.parents[0] !== (await this.folders.resolve()) ||
			file.appProperties?.contentSchema !== "1" ||
			!file.version ||
			!file.description ||
			!(await this.readable(id))
		)
			throw new ContentMediaChangedError(
				"Content media is not a verified public artifact",
			);
		if (file.mimeType !== "image/png" && file.mimeType !== "image/jpeg")
			throw new ContentMediaChangedError("Invalid content media type");
		const response = await this.client.files.get(
			{ fileId: id, alt: "media", supportsAllDrives: true },
			{
				...requestOptions,
				responseType: "stream",
				signal: AbortSignal.timeout(30_000),
			},
		);
		const bytes = await this.stream.read(response.data, 20_000_000);
		const inspected = this.image.inspect({ bytes, mimeType: file.mimeType });
		if (inspected.fingerprint !== file.appProperties.contentHash)
			throw new ContentMediaChangedError("Stored content image changed");
		return {
			id,
			url: `https://drive.google.com/uc?export=download&id=${id}`,
			...inspected,
			mimeType: file.mimeType,
			description: file.description,
			sourceRevision: file.version,
		};
	}
	async verify(media: ContentMedia): Promise<boolean> {
		if (media.source) return this.announcement.verify(media);
		try {
			const actual = await this.read(media.id);
			return (
				actual !== undefined &&
				actual.fingerprint === media.fingerprint &&
				actual.url === media.url &&
				actual.description === media.description
			);
		} catch (error) {
			if (error instanceof ContentMediaChangedError) return false;
			throw error;
		}
	}
	private async readable(fileId: string): Promise<boolean> {
		let pageToken: string | undefined;
		let readable = false;
		const seen = new Set<string>();
		for (let page = 0; page < 10; page++) {
			const { data } = await this.client.permissions.list(
				{
					fileId,
					supportsAllDrives: true,
					pageSize: 100,
					pageToken,
					fields: "nextPageToken,permissions(type,role)",
				},
				requestOptions,
			);
			if (!Array.isArray(data.permissions))
				throw new ContentMediaChangedError(
					"Content permissions are unavailable",
				);
			readable ||= data.permissions.some(
				(permission) =>
					permission.type === "anyone" && permission.role === "reader",
			);
			pageToken = data.nextPageToken ?? undefined;
			if (!pageToken) return readable;
			if (seen.has(pageToken)) break;
			seen.add(pageToken);
		}
		throw new ContentMediaChangedError(
			"Content permission listing is incomplete",
		);
	}
}
