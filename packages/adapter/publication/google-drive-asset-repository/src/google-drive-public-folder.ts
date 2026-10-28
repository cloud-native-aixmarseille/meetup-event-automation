import {
	PdfExportError,
	type PdfExportIdentity,
} from "@meetup-automation/publication";
import type { DrivePdfMetadata } from "./drive-pdf-metadata.js";
import {
	folderMimeType,
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";

const folderFields = "id,mimeType,trashed";

export class GoogleDrivePublicFolder {
	constructor(
		private readonly client: GoogleDriveClient,
		private readonly metadata: Pick<DrivePdfMetadata, "validateIdentity">,
		private readonly folderId: string,
	) {}

	async resolve(identity: PdfExportIdentity): Promise<string> {
		this.metadata.validateIdentity(identity);
		if (
			!/^[\w-]{1,120}$/.test(this.folderId) ||
			[identity.folderId, identity.sourceId, identity.templateId].includes(
				this.folderId,
			)
		)
			throw new PdfExportError("recovery");
		const { data } = await this.client.files.get(
			{
				fileId: this.folderId,
				fields: folderFields,
				supportsAllDrives: true,
			},
			requestOptions,
		);
		if (
			data.id !== this.folderId ||
			data.mimeType !== folderMimeType ||
			data.trashed
		)
			throw new PdfExportError("recovery");
		return this.folderId;
	}
}
