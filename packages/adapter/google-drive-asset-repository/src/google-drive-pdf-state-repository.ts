import { Readable } from "node:stream";
import {
	PdfExportError,
	type PdfExportIdentity,
	type PdfExportState,
	type PdfExportStateRepository,
} from "@meetup-automation/publication";
import type { DriveBoundedStream } from "./drive-bounded-stream.js";
import type { DrivePdfLookup } from "./drive-pdf-lookup.js";
import type { DrivePdfMetadata, PdfDriveFile } from "./drive-pdf-metadata.js";
import type { DrivePdfStateCodec } from "./drive-pdf-state-codec.js";
import {
	type DriveFile,
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";

export class GoogleDrivePdfStateRepository implements PdfExportStateRepository {
	private readonly loaded = new Map<string, PdfDriveFile | undefined>();
	constructor(
		private readonly client: GoogleDriveClient,
		private readonly lookup: Pick<DrivePdfLookup, "find" | "get">,
		private readonly metadata: Pick<DrivePdfMetadata, "file" | "properties">,
		private readonly stream: Pick<DriveBoundedStream, "read">,
		private readonly codec: Pick<DrivePdfStateCodec, "decode" | "encode">,
	) {}

	async load(identity: PdfExportIdentity): Promise<PdfExportState | undefined> {
		const file = await this.lookup.find(identity, "state");
		this.loaded.set(identity.sourceId, file);
		if (!file) return undefined;
		const response = await this.client.files.get(
			{ fileId: file.id, alt: "media", supportsAllDrives: true },
			{
				...requestOptions,
				responseType: "stream",
				signal: AbortSignal.timeout(30_000),
			},
		);
		let value: unknown;
		try {
			const bytes = await this.stream.read(response.data, 65_536);
			value = JSON.parse(bytes.toString("utf8"));
		} catch (error) {
			if (error instanceof SyntaxError || error instanceof PdfExportError)
				throw new PdfExportError("recovery");
			throw error;
		}
		const current = await this.lookup.get(file.id);
		if (
			!current ||
			this.metadata.file(current, identity, "state").version !== file.version
		)
			throw new PdfExportError("recovery");
		return this.codec.decode(value, identity);
	}

	async save(state: PdfExportState): Promise<void> {
		const json = this.codec.encode(state);
		const prior = this.loaded.get(state.identity.sourceId);
		if (!this.loaded.has(state.identity.sourceId))
			throw new PdfExportError("recovery");
		const current = await this.lookup.find(state.identity, "state", prior?.id);
		if (current?.id !== prior?.id || current?.version !== prior?.version)
			throw new PdfExportError("recovery");
		const media = { mimeType: "application/json", body: Readable.from([json]) };
		const options = {
			supportsAllDrives: true,
			fields:
				"id,name,description,parents,mimeType,trashed,version,appProperties",
			media,
		};
		const response = current
			? await this.client.files.update(
					{ ...options, fileId: current.id },
					requestOptions,
				)
			: await this.client.files.create(
					{
						...options,
						requestBody: {
							name: `.${state.identity.sourceId}.pdf-export.json`,
							description: state.identity.eventId,
							mimeType: "application/json",
							parents: [state.identity.folderId],
							appProperties: this.metadata.properties(state.identity, "state"),
						},
					},
					requestOptions,
				);
		this.acceptWrite(response.data, state.identity, current?.id);
	}
	private acceptWrite(
		file: DriveFile,
		identity: PdfExportIdentity,
		previousId: string | undefined,
	): void {
		try {
			const saved = this.metadata.file(file, identity, "state");
			if (previousId && saved.id !== previousId)
				throw new PdfExportError("invalid");
			this.loaded.set(identity.sourceId, saved);
		} catch (error) {
			if (error instanceof PdfExportError) throw new PdfExportError("invalid");
			throw error;
		}
	}
}
