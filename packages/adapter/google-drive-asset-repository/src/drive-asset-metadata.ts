import type {
	AssetContainer,
	AssetFile,
	AssetTemplate,
} from "@meetup-automation/publication";
import type { DriveFile } from "./google-drive-asset-repository-contracts.js";
import { GoogleDriveAssetRepositoryError } from "./google-drive-asset-repository-error.js";

/** Map provider file metadata to the asset port's allowlisted public facts. */
export class DriveAssetMetadata {
	static templateProperties(template: AssetTemplate): Record<string, string> {
		return { template_file_id: template.id, template_kind: template.kind };
	}

	static container(file: DriveFile, eventId: string): AssetContainer {
		if (
			typeof file.id !== "string" ||
			!file.id ||
			typeof file.name !== "string" ||
			!file.name
		)
			throw new GoogleDriveAssetRepositoryError(
				"Google Drive returned an invalid asset folder",
			);
		return {
			id: file.id,
			name: file.name,
			url: `https://drive.google.com/drive/folders/${file.id}`,
			eventId,
		};
	}

	static assetFile(file: DriveFile): AssetFile {
		if (
			typeof file.id !== "string" ||
			!file.id ||
			typeof file.name !== "string" ||
			!file.name
		)
			throw new GoogleDriveAssetRepositoryError(
				"Google Drive returned an invalid asset file",
			);
		return {
			id: file.id,
			name: file.name,
			...(file.webViewLink ? { url: file.webViewLink } : {}),
			templateId: file.appProperties?.template_file_id,
			kind: file.appProperties?.template_kind,
			mimeType: file.mimeType ?? undefined,
			contentManaged: file.appProperties?.meetup_content === "v1",
		};
	}
}
