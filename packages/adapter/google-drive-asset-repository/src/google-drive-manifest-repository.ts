import { Readable } from "node:stream";
import {
	type AssetManifestRepository,
	type ContentManifest,
	ContentError,
} from "@meetup-automation/publication";
import {
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";

export class GoogleDriveManifestRepository implements AssetManifestRepository {
	constructor(private readonly client: GoogleDriveClient) {}

	async load(folderId: string, fileId: string): Promise<unknown | undefined> {
		const id = await this.find(folderId, fileId);
		if (!id) return undefined;
		const { data } = await this.client.files.get(
			{ fileId: id, alt: "media", supportsAllDrives: true },
			{ ...requestOptions, responseType: "stream" },
		);
		const chunks: Buffer[] = [];
		let size = 0;
		for await (const chunk of data) {
			size += chunk.length;
			if (size > 1_000_000) {
				data.destroy();
				throw new ContentError("recovery");
			}
			chunks.push(Buffer.from(chunk));
		}
		try {
			return JSON.parse(Buffer.concat(chunks).toString("utf8"));
		} catch {
			throw new ContentError("recovery");
		}
	}

	async save(folderId: string, manifest: ContentManifest): Promise<void> {
		const id = await this.find(folderId, manifest.fileId);
		const json = JSON.stringify(manifest);
		if (Buffer.byteLength(json) > 1_000_000) throw new ContentError("recovery");
		const media = { mimeType: "application/json", body: Readable.from([json]) };
		if (id) {
			await this.client.files.update(
				{ fileId: id, media, supportsAllDrives: true },
				requestOptions,
			);
		} else {
			await this.client.files.create(
				{
					requestBody: {
						name: `.${manifest.fileId}.bindings.json`,
						mimeType: "application/json",
						parents: [folderId],
						appProperties: { meetup_binding_file: manifest.fileId },
					},
					media,
					supportsAllDrives: true,
				},
				requestOptions,
			);
		}
	}

	private async find(
		folderId: string,
		fileId: string,
	): Promise<string | undefined> {
		if (![folderId, fileId].every((id) => /^[\w-]+$/.test(id)))
			throw new ContentError("recovery");
		const { data } = await this.client.files.list(
			{
				q: `'${folderId}' in parents and trashed=false and appProperties has { key='meetup_binding_file' and value='${fileId}' }`,
				fields:
					"nextPageToken,incompleteSearch,files(id,mimeType,parents,appProperties)",
				pageSize: 100,
				supportsAllDrives: true,
				includeItemsFromAllDrives: true,
			},
			requestOptions,
		);
		if (
			data.incompleteSearch ||
			data.nextPageToken ||
			(data.files?.length ?? 0) > 1
		)
			throw new ContentError("recovery");
		const file = data.files?.[0];
		if (
			file &&
			(!file.id ||
				file.mimeType !== "application/json" ||
				!file.parents?.includes(folderId) ||
				file.appProperties?.meetup_binding_file !== fileId)
		)
			throw new ContentError("recovery");
		return file?.id ?? undefined;
	}
}
