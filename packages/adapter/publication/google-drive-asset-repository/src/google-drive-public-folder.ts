import {
	PdfExportError,
	type PdfExportIdentity,
} from "@meetup-automation/publication";
import type { DrivePdfMetadata } from "./drive-pdf-metadata.js";
import { DrivePublicFolderError } from "./drive-public-folder-error.js";
import type { GoogleDrivePublicAssetFolder } from "./google-drive-public-asset-folder.js";

export class GoogleDrivePublicFolder {
	constructor(
		private readonly folders: Pick<GoogleDrivePublicAssetFolder, "resolve">,
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
		try {
			const id = await this.folders.resolve();
			if (
				[identity.folderId, identity.sourceId, identity.templateId].includes(id)
			)
				throw new PdfExportError("recovery");
			return id;
		} catch (error) {
			if (error instanceof DrivePublicFolderError)
				throw new PdfExportError("recovery");
			throw error;
		}
	}
}
