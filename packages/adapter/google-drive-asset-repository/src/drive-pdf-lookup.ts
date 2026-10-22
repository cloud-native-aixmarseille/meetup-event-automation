import {
	PdfExportError,
	type PdfExportIdentity,
} from "@meetup-automation/publication";
import type {
	DrivePdfMetadata,
	PdfDriveFile,
	PdfFileKind,
} from "./drive-pdf-metadata.js";
import {
	type DriveFile,
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";
import type { GoogleDrivePublicFolder } from "./google-drive-public-folder.js";

const exportFields =
	"id,name,description,mimeType,parents,trashed,version,appProperties";

export class DrivePdfLookup {
	constructor(
		private readonly client: GoogleDriveClient,
		private readonly metadata: Pick<
			DrivePdfMetadata,
			"validateIdentity" | "marker" | "file"
		>,
		private readonly folders: Pick<GoogleDrivePublicFolder, "resolve">,
	) {}

	async find(
		identity: PdfExportIdentity,
		kind: PdfFileKind,
		expectedId?: string,
	): Promise<PdfDriveFile | undefined> {
		this.metadata.validateIdentity(identity);
		const publicFolderId =
			kind === "pdf" ? await this.folders.resolve(identity) : undefined;
		const parents = publicFolderId
			? `('${identity.folderId}' in parents or '${publicFolderId}' in parents)`
			: `'${identity.folderId}' in parents`;
		const { data } = await this.client.files.list(
			{
				q: `${parents} and trashed=false and appProperties has { key='${this.metadata.marker(kind)}' and value='${identity.sourceId}' }`,
				fields: `nextPageToken,incompleteSearch,files(${exportFields})`,
				pageSize: 100,
				supportsAllDrives: true,
				includeItemsFromAllDrives: true,
			},
			requestOptions,
		);
		if (
			(data.files !== undefined && !Array.isArray(data.files)) ||
			data.incompleteSearch ||
			data.nextPageToken
		)
			throw new Error("Google Drive PDF search is incomplete");
		if ((data.files?.length ?? 0) > 1) throw new PdfExportError("recovery");
		const file =
			data.files?.[0] ?? (expectedId ? await this.get(expectedId) : undefined);
		if (!file) return undefined;
		const result = this.metadata.file(file, identity, kind, publicFolderId);
		if (expectedId && result.id !== expectedId)
			throw new PdfExportError("recovery");
		return result;
	}

	async get(fileId: string): Promise<DriveFile | undefined> {
		if (!/^[\w-]{1,120}$/.test(fileId)) throw new PdfExportError("recovery");
		try {
			const { data } = await this.client.files.get(
				{ fileId, fields: exportFields, supportsAllDrives: true },
				requestOptions,
			);
			return data;
		} catch (error) {
			if (error && typeof error === "object" && "response" in error) {
				const response = error.response;
				if (
					response &&
					typeof response === "object" &&
					"status" in response &&
					response.status === 404
				)
					return undefined;
			}
			throw error;
		}
	}
}
