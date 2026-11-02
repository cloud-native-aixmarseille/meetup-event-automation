import { createHash } from "node:crypto";
import type { drive_v3 } from "@googleapis/drive";
import {
	ContentMediaChangedError,
	type EventCoverRepository,
} from "@meetup-automation/publication";
import {
	folderMimeType,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";
import type { GoogleDrivePublicAssetFolder } from "./google-drive-public-asset-folder.js";

/** Keeps media in staging or in the event folder recorded by its managed move. */
export class DriveContentLocation {
	constructor(
		private readonly client: Pick<drive_v3.Drive, "files" | "permissions">,
		private readonly folders: Pick<GoogleDrivePublicAssetFolder, "resolve">,
	) {}

	async valid(file: drive_v3.Schema$File): Promise<boolean> {
		const parent = file.parents?.[0];
		if (!parent || file.parents?.length !== 1) return false;
		const key = file.appProperties?.contentEventKey;
		if (!key) return parent === (await this.folders.resolve());
		return this.eventFolder(parent, key);
	}

	async place(
		input: Parameters<EventCoverRepository["place"]>[0],
	): Promise<void> {
		const { media, container, name } = input;
		const key = createHash("sha256")
			.update(`${container.eventId}:assets:v1`)
			.digest("hex");
		if (!(await this.eventFolder(container.id, key)))
			throw new ContentMediaChangedError(
				"Cover destination is not this event's managed folder",
			);
		const file = await this.file(media.id);
		if (
			!(await this.valid(file)) ||
			file.trashed ||
			(file.appProperties?.contentEventKey &&
				file.appProperties.contentEventKey !== key)
		)
			throw new ContentMediaChangedError(
				"Cover location changed before placement",
			);
		await this.move(file, input, key);
		const actual = await this.file(media.id);
		if (
			actual.name !== name ||
			actual.parents?.[0] !== container.id ||
			actual.appProperties?.contentEventKey !== key ||
			actual.trashed ||
			!(await this.valid(actual))
		)
			throw new ContentMediaChangedError(
				"Cover placement could not be verified",
			);
	}

	private async move(
		file: drive_v3.Schema$File,
		input: Parameters<EventCoverRepository["place"]>[0],
		key: string,
	): Promise<void> {
		const { media, container, name } = input;
		const moved = file.parents?.[0] !== container.id;
		if (moved) {
			// Preserve the already-public image's access when leaving its public parent.
			// Never share the event folder or its other files.
			await this.client.permissions.create(
				{
					fileId: media.id,
					supportsAllDrives: true,
					requestBody: {
						type: "anyone",
						role: "reader",
						allowFileDiscovery: false,
					},
					fields: "id",
				},
				requestOptions,
			);
		}
		if (moved || file.name !== name) {
			await this.client.files.update(
				{
					fileId: media.id,
					supportsAllDrives: true,
					...(moved
						? { addParents: container.id, removeParents: file.parents?.[0] }
						: {}),
					requestBody: {
						name,
						appProperties: { ...file.appProperties, contentEventKey: key },
					},
				},
				requestOptions,
			);
		}
	}

	private async eventFolder(id: string, key: string): Promise<boolean> {
		if (!/^[\w-]+$/.test(id) || !/^[a-f0-9]{64}$/.test(key)) return false;
		const folder = await this.file(id);
		return (
			!folder.trashed &&
			folder.mimeType === folderMimeType &&
			folder.appProperties?.meetup_event_key === key
		);
	}

	private async file(id: string): Promise<drive_v3.Schema$File> {
		const { data } = await this.client.files.get(
			{
				fileId: id,
				supportsAllDrives: true,
				fields: "id,name,mimeType,parents,trashed,appProperties",
			},
			requestOptions,
		);
		return data;
	}
}
