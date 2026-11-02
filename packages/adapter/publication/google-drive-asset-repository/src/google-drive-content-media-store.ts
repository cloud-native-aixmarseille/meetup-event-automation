import { Readable } from "node:stream";
import type { drive_v3 } from "@googleapis/drive";
import {
	type ContentImageBytes,
	type ContentMedia,
	ContentMediaChangedError,
	type ContentMediaStore,
	type EventCoverRepository,
} from "@meetup-automation/publication";
import type { DriveAnnouncementImage } from "./drive-announcement-image.js";
import type { DriveBoundedStream } from "./drive-bounded-stream.js";
import type { DriveContentImage } from "./drive-content-image.js";
import type { DriveContentSharing } from "./drive-content-sharing.js";
import type { DriveContentLocation } from "./drive-content-location.js";
import { requestOptions } from "./google-drive-asset-repository-contracts.js";
import type { GoogleDrivePublicAssetFolder } from "./google-drive-public-asset-folder.js";

/** Immutable public artwork, staged for review then placed in its event folder. */
export class GoogleDriveContentMediaStore
	implements ContentMediaStore, EventCoverRepository
{
	constructor(
		private readonly client: Pick<drive_v3.Drive, "files" | "permissions">,
		private readonly folders: Pick<GoogleDrivePublicAssetFolder, "resolve">,
		private readonly image: Pick<DriveContentImage, "inspect">,
		private readonly stream: Pick<DriveBoundedStream, "read">,
		private readonly announcement: Pick<DriveAnnouncementImage, "verify">,
		private readonly location: Pick<DriveContentLocation, "valid" | "place">,
		private readonly sharing: Pick<DriveContentSharing, "readable">,
	) {}
	async place(
		input: Parameters<EventCoverRepository["place"]>[0],
	): Promise<void> {
		if (input.media.source)
			throw new ContentMediaChangedError(
				"Only generated cover artwork can be placed",
			);
		const current = await this.readMedia(input.media.id, false);
		if (!this.matches(input.media, current))
			throw new ContentMediaChangedError(
				"Selected cover is no longer the approved artwork",
			);
		await this.location.place(input);
		if (!(await this.verify(input.media)))
			throw new ContentMediaChangedError(
				"Approved cover could not be verified after placement",
			);
	}
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
		return this.readMedia(id, true);
	}
	private async readMedia(
		id: string,
		requirePublicAccess: boolean,
	): Promise<ContentMedia | undefined> {
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
			!(await this.location.valid(file)) ||
			file.appProperties?.contentSchema !== "1" ||
			!file.version ||
			!file.description ||
			(!(await this.sharing.readable(id)) &&
				(requirePublicAccess ||
					!file.appProperties.contentEventKey ||
					file.appProperties.contentPlacementPending !== "1"))
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
			return this.matches(media, actual);
		} catch (error) {
			if (error instanceof ContentMediaChangedError) return false;
			throw error;
		}
	}

	private matches(
		media: ContentMedia,
		actual: ContentMedia | undefined,
	): boolean {
		return (
			actual !== undefined &&
			actual.fingerprint === media.fingerprint &&
			actual.url === media.url &&
			actual.description === media.description
		);
	}
}
