import type { drive_v3 } from "@googleapis/drive";

export type DriveFile = drive_v3.Schema$File;

export type GoogleDriveClient = Pick<drive_v3.Drive, "files">;

export type GoogleDriveAssetOptions = Readonly<{
	parentFolderId: string;
	templateFolderId: string;
}>;

export const folderMimeType = "application/vnd.google-apps.folder";

export const fields =
	"id,name,webViewLink,mimeType,parents,trashed,appProperties";

// A workflow retry first looks up stable metadata. Do not automatically replay a
// create/copy after a lost response: the first request may already have succeeded.
export const requestOptions = { retry: false, timeout: 30_000 };
