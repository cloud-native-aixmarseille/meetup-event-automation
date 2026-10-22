import { Readable } from "node:stream";
import {
	PdfExportError,
	type PdfExportIdentity,
	type PdfExportObservation,
	type PdfExportRepository,
} from "@meetup-automation/publication";
import type { DrivePdfBinary } from "./drive-pdf-binary.js";
import type { DrivePdfLookup } from "./drive-pdf-lookup.js";
import type { DrivePdfMetadata } from "./drive-pdf-metadata.js";
import {
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";
import type { GoogleDrivePublicFolder } from "./google-drive-public-folder.js";

export class GoogleDrivePdfRepository implements PdfExportRepository {
	constructor(
		private readonly client: GoogleDriveClient,
		private readonly lookup: Pick<DrivePdfLookup, "find" | "get">,
		private readonly metadata: Pick<DrivePdfMetadata, "file" | "properties">,
		private readonly binary: Pick<DrivePdfBinary, "read">,
		private readonly folders: Pick<GoogleDrivePublicFolder, "resolve">,
	) {}

	async find(
		identity: PdfExportIdentity,
		expectedId?: string,
	): Promise<
		(PdfExportObservation & { readonly folderId: string }) | undefined
	> {
		const file = await this.lookup.find(identity, "pdf", expectedId);
		if (!file) return undefined;
		try {
			const response = await this.client.files.get(
				{ fileId: file.id, alt: "media", supportsAllDrives: true },
				{
					...requestOptions,
					responseType: "stream",
					signal: AbortSignal.timeout(30_000),
				},
			);
			const binary = await this.binary.read(
				response.data,
				response.headers["content-type"],
			);
			const current = await this.lookup.get(file.id);
			if (
				!current ||
				this.metadata.file(current, identity, "pdf", file.folderId).version !==
					file.version
			)
				throw new PdfExportError("conflict");
			return { ...file, fingerprint: binary.fingerprint };
		} catch (error) {
			if (
				error instanceof PdfExportError &&
				["invalid", "limit"].includes(error.code)
			)
				throw new PdfExportError("conflict");
			throw error;
		}
	}

	async placeInPublicFolder(
		identity: PdfExportIdentity,
		expected: PdfExportObservation,
	): Promise<boolean> {
		const folderId = await this.folders.resolve(identity);
		const current = await this.find(identity, expected.id);
		if (
			!current ||
			current.version !== expected.version ||
			current.fingerprint !== expected.fingerprint ||
			current.name !== expected.name
		)
			throw new PdfExportError("conflict");
		if (current.folderId === folderId) return false;
		await this.client.files.update(
			{
				fileId: expected.id,
				addParents: folderId,
				removeParents: identity.folderId,
				supportsAllDrives: true,
			},
			requestOptions,
		);
		const moved = await this.find(identity, expected.id);
		if (
			!moved ||
			moved.folderId !== folderId ||
			moved.name !== expected.name ||
			moved.fingerprint !== expected.fingerprint
		)
			throw new PdfExportError("invalid");
		return true;
	}

	async reserveId(): Promise<string> {
		const { data } = await this.client.files.generateIds(
			{ count: 1, space: "drive", type: "files" },
			requestOptions,
		);
		const id = data.ids?.[0];
		if (data.ids?.length !== 1 || !id || !/^[\w-]{1,120}$/.test(id))
			throw new PdfExportError("invalid");
		return id;
	}

	async write(
		input: Parameters<PdfExportRepository["write"]>[0],
	): Promise<void> {
		const current = await this.find(input.identity, input.fileId);
		if (
			current?.version !== input.previous?.version ||
			current?.fingerprint !== input.previous?.fingerprint
		)
			throw new PdfExportError("conflict");
		const requestBody = {
			name: input.snapshot.name,
			description: input.identity.eventId,
			mimeType: "application/pdf",
			appProperties: this.metadata.properties(input.identity, "pdf"),
		};
		const media = {
			mimeType: "application/pdf",
			body: Readable.from([input.binary.bytes]),
		};
		if (current) {
			await this.client.files.update(
				{ fileId: input.fileId, requestBody, media, supportsAllDrives: true },
				requestOptions,
			);
		} else {
			await this.client.files.create(
				{
					requestBody: {
						...requestBody,
						id: input.fileId,
						parents: [input.identity.folderId],
					},
					media,
					supportsAllDrives: true,
				},
				requestOptions,
			);
		}
	}
}
