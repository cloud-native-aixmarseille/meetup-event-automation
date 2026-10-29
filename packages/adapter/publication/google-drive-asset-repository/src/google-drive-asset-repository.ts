import { createHash } from "node:crypto";
import type {
	AssetContainer,
	AssetFile,
	AssetRepository,
	AssetTemplate,
	EnsureAssetContainerRequest,
} from "@meetup-automation/publication";
import type { DriveAssetMetadata } from "./drive-asset-metadata.js";
import {
	type DriveFile,
	fields,
	folderMimeType,
	type GoogleDriveAssetOptions,
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";
import { GoogleDriveAssetRepositoryError } from "./google-drive-asset-repository-error.js";

export interface GoogleDriveAssetRepositoryCollaborators {
	readonly driveAssetMetadata: Pick<
		DriveAssetMetadata,
		"container" | "assetFile" | "templateProperties"
	>;
}

export class GoogleDriveAssetRepository implements AssetRepository {
	constructor(
		private readonly collaborators: GoogleDriveAssetRepositoryCollaborators,
		private readonly client: GoogleDriveClient,
		private readonly options: GoogleDriveAssetOptions,
	) {
		if (
			![options.parentFolderId, options.templateFolderId].every((id) =>
				/^[\w-]+$/.test(id),
			) ||
			options.parentFolderId === options.templateFolderId
		)
			throw this.failure(
				"Distinct Google Drive parent and template folder IDs are required",
			);
	}

	async findContainer(
		request: EnsureAssetContainerRequest,
	): Promise<AssetContainer | undefined> {
		const matches = await this.list(
			`mimeType='${folderMimeType}' and appProperties has { key='meetup_event_key' and value='${this.key(request)}' }`,
			"allDrives",
		);
		if (matches.length > 1)
			throw this.failure(
				"Multiple asset folders match this event; manual reconciliation is required",
			);
		const file = matches[0];
		if (!file) return undefined;
		if (
			file.trashed ||
			file.mimeType !== folderMimeType ||
			file.appProperties?.meetup_event_key !== this.key(request)
		) {
			throw this.failure("The asset folder does not match the requested event");
		}
		return this.collaborators.driveAssetMetadata.container(
			file,
			request.eventId,
		);
	}

	async ensureContainer(
		request: EnsureAssetContainerRequest,
	): Promise<AssetContainer> {
		const current = await this.findContainer(request);
		if (current?.name === request.title) return current;
		const appProperties = {
			meetup_event_key: this.key(request),
		};
		const response = current
			? await this.remote(() =>
					this.client.files.update(
						{
							fileId: current.id,
							requestBody: { name: request.title, appProperties },
							fields,
							supportsAllDrives: true,
						},
						requestOptions,
					),
				)
			: await this.remote(() =>
					this.client.files.create(
						{
							requestBody: {
								name: request.title,
								mimeType: folderMimeType,
								parents: [this.options.parentFolderId],
								appProperties,
							},
							fields,
							supportsAllDrives: true,
						},
						requestOptions,
					),
				);
		return this.collaborators.driveAssetMetadata.container(
			response.data,
			request.eventId,
		);
	}

	async listTemplates(): Promise<readonly AssetTemplate[]> {
		return (
			await this.list(
				`'${this.escapeQuery(this.options.templateFolderId)}' in parents`,
			)
		).map((file) => {
			if (
				!file.id ||
				!file.name ||
				!file.appProperties?.template_kind ||
				file.mimeType === folderMimeType
			)
				throw this.failure(
					"Every asset template must be a file with an ID, name, and template_kind",
				);
			return {
				id: file.id,
				name: file.name,
				kind: file.appProperties.template_kind,
				mimeType: file.mimeType ?? undefined,
			};
		});
	}

	async listFiles(containerId: string): Promise<readonly AssetFile[]> {
		return (
			await this.list(
				`'${this.escapeQuery(containerId)}' in parents and mimeType!='${folderMimeType}'`,
			)
		)
			.filter(
				(file) =>
					!file.appProperties?.meetup_binding_file &&
					!file.appProperties?.meetup_pdf_source &&
					!file.appProperties?.meetup_pdf_state,
			)
			.map(
				this.collaborators.driveAssetMetadata.assetFile.bind(
					this.collaborators.driveAssetMetadata,
				),
			);
	}

	async copyTemplate(
		containerId: string,
		template: AssetTemplate,
		name: string,
	): Promise<AssetFile> {
		const { data } = await this.remote(() =>
			this.client.files.copy(
				{
					fileId: template.id,
					requestBody: {
						name,
						parents: [containerId],
						appProperties: {
							...this.collaborators.driveAssetMetadata.templateProperties(
								template,
							),
							...(template.contentContract ? { meetup_content: "v1" } : {}),
						},
					},
					fields,
					supportsAllDrives: true,
				},
				requestOptions,
			),
		);
		return this.collaborators.driveAssetMetadata.assetFile(data);
	}

	async updateFile(
		file: AssetFile,
		template: AssetTemplate,
		name: string,
	): Promise<AssetFile> {
		const { data } = await this.remote(() =>
			this.client.files.update(
				{
					fileId: file.id,
					requestBody: {
						name,
						appProperties: {
							...this.collaborators.driveAssetMetadata.templateProperties(
								template,
							),
							...(file.contentManaged ? { meetup_content: "v1" } : {}),
						},
					},
					fields,
					supportsAllDrives: true,
				},
				requestOptions,
			),
		);
		return this.collaborators.driveAssetMetadata.assetFile(data);
	}

	private async list(
		query: string,
		corpora: "user" | "allDrives" = "user",
	): Promise<DriveFile[]> {
		const files: DriveFile[] = [];
		let pageToken: string | undefined;
		const tokens = new Set<string>();
		do {
			const { data } = await this.remote(() =>
				this.client.files.list(
					{
						q: `${query} and trashed=false`,
						corpora,
						fields: `nextPageToken,incompleteSearch,files(${fields})`,
						pageSize: 100,
						pageToken,
						supportsAllDrives: true,
						includeItemsFromAllDrives: true,
					},
					requestOptions,
				),
			);
			if (data.incompleteSearch)
				throw this.failure(
					"Google Drive returned an incomplete search; reconciliation was stopped",
				);
			files.push(...(data.files ?? []));
			pageToken = data.nextPageToken || undefined;
			if (pageToken && tokens.has(pageToken))
				throw this.failure("Google Drive returned a repeated pagination token");
			if (pageToken) tokens.add(pageToken);
		} while (pageToken);
		return files;
	}

	private key(request: EnsureAssetContainerRequest): string {
		return createHash("sha256").update(request.idempotencyKey).digest("hex");
	}

	private escapeQuery(value: string): string {
		return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
	}

	private failure(message: string): GoogleDriveAssetRepositoryError {
		return new GoogleDriveAssetRepositoryError(message);
	}

	private async remote<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			const response =
				error !== null && typeof error === "object" && "response" in error
					? error.response
					: undefined;
			const status =
				response !== null &&
				typeof response === "object" &&
				"status" in response
					? response.status
					: undefined;
			if (status === 429)
				throw this.failure(
					"Google Drive rate limit reached; retry reconciliation later",
				);
			if (status === 401 || status === 403)
				throw this.failure(
					"Google Drive denied access; check credentials, folder access, and quota",
				);
			throw this.failure(
				"Google Drive request failed; inspect provider state before retrying an uncertain write",
			);
		}
	}
}
export type GoogleDriveAssetRepositoryArguments =
	ConstructorParameters<typeof GoogleDriveAssetRepository> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
