import { DrivePublicFolderError } from "./drive-public-folder-error.js";
import {
	type DriveFile,
	folderMimeType,
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";

/** Resolves an existing direct child; inspection never creates or shares folders. */
export class GoogleDrivePublicAssetFolder {
	constructor(
		private readonly client: GoogleDriveClient,
		private readonly rootId: string,
		private readonly name: "slides" | "tmp-covers",
	) {}

	async resolve(): Promise<string> {
		if (!/^[\w-]{1,120}$/.test(this.rootId))
			throw new DrivePublicFolderError("Invalid public root identity");
		const root = await this.client.files.get(
			{
				fileId: this.rootId,
				fields: "id,mimeType,trashed",
				supportsAllDrives: true,
			},
			requestOptions,
		);
		if (
			root.data.id !== this.rootId ||
			root.data.mimeType !== folderMimeType ||
			root.data.trashed
		)
			throw new DrivePublicFolderError("Invalid public root folder");
		const { data } = await this.client.files.list(
			{
				q: `'${this.rootId}' in parents and name='${this.name}' and trashed=false`,
				fields:
					"nextPageToken,incompleteSearch,files(id,name,mimeType,parents,trashed)",
				pageSize: 100,
				supportsAllDrives: true,
				includeItemsFromAllDrives: true,
			},
			requestOptions,
		);
		if (
			!Array.isArray(data.files) ||
			data.files.length !== 1 ||
			data.nextPageToken ||
			data.incompleteSearch
		)
			throw new DrivePublicFolderError(
				"Public asset folder is missing or ambiguous",
			);
		return this.child(data.files[0]);
	}
	private child(folder: DriveFile | undefined): string {
		if (
			!folder?.id ||
			!/^[\w-]{1,120}$/.test(folder.id) ||
			folder.id === this.rootId ||
			folder.name !== this.name ||
			folder.mimeType !== folderMimeType ||
			folder.trashed ||
			folder.parents?.length !== 1 ||
			folder.parents[0] !== this.rootId
		)
			throw new DrivePublicFolderError("Invalid public asset folder");
		return folder.id;
	}
}
