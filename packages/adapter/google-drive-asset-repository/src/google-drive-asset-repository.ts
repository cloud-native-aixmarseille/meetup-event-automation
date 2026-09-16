import { createHash } from "node:crypto";
import { auth, drive } from "@googleapis/drive";
import type {
	AssetContainer,
	AssetFile,
	AssetRepository,
	AssetTemplate,
	EnsureAssetContainerRequest,
} from "@meetup-automation/publication";
import {
	type DriveFile,
	fields,
	folderMimeType,
	type GoogleDriveAssetOptions,
	type GoogleDriveClient,
	requestOptions,
} from "./google-drive-asset-repository-contracts.js";
import { GoogleDriveAssetRepositoryError } from "./google-drive-asset-repository-error.js";

export class GoogleDriveAssetRepository implements AssetRepository {
	constructor(
		private readonly client: GoogleDriveClient,
		private readonly options: GoogleDriveAssetOptions,
	) {
		if (
			![options.parentFolderId, options.templateFolderId].every((id) =>
				/^[\w-]+$/.test(id),
			) ||
			options.parentFolderId === options.templateFolderId
		)
			throw GoogleDriveAssetRepository.failure(
				"Distinct Google Drive parent and template folder IDs are required",
			);
	}

	async findContainer(
		request: EnsureAssetContainerRequest,
	): Promise<AssetContainer | undefined> {
		const matches = await this.list(
			`'${GoogleDriveAssetRepository.escapeQuery(this.options.parentFolderId)}' in parents and mimeType='${folderMimeType}' and appProperties has { key='meetup_event_key' and value='${GoogleDriveAssetRepository.key(request)}' }`,
		);
		if (matches.length > 1)
			throw GoogleDriveAssetRepository.failure(
				"Multiple asset folders match this event; manual reconciliation is required",
			);
		const file = matches[0];
		if (!file) return undefined;
		if (
			file.trashed ||
			file.mimeType !== folderMimeType ||
			!file.parents?.includes(this.options.parentFolderId) ||
			file.appProperties?.meetup_event_key !==
				GoogleDriveAssetRepository.key(request)
		) {
			throw GoogleDriveAssetRepository.failure(
				"The asset folder does not match the requested event and configured parent",
			);
		}
		return GoogleDriveAssetRepository.container(file, request.eventId);
	}

	async ensureContainer(
		request: EnsureAssetContainerRequest,
	): Promise<AssetContainer> {
		const current = await this.findContainer(request);
		if (current?.name === request.title) return current;
		const appProperties = {
			meetup_event_key: GoogleDriveAssetRepository.key(request),
		};
		const response = current
			? await GoogleDriveAssetRepository.remote(() =>
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
			: await GoogleDriveAssetRepository.remote(() =>
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
		return GoogleDriveAssetRepository.container(response.data, request.eventId);
	}

	async listTemplates(): Promise<readonly AssetTemplate[]> {
		return (
			await this.list(
				`'${GoogleDriveAssetRepository.escapeQuery(this.options.templateFolderId)}' in parents`,
			)
		).map((file) => {
			if (
				!file.id ||
				!file.name ||
				!file.appProperties?.template_kind ||
				file.mimeType === folderMimeType
			)
				throw GoogleDriveAssetRepository.failure(
					"Every asset template must be a file with an ID, name, and template_kind",
				);
			return {
				id: file.id,
				name: file.name,
				kind: file.appProperties.template_kind,
			};
		});
	}

	async listFiles(containerId: string): Promise<readonly AssetFile[]> {
		return (
			await this.list(
				`'${GoogleDriveAssetRepository.escapeQuery(containerId)}' in parents and mimeType!='${folderMimeType}'`,
			)
		).map(GoogleDriveAssetRepository.assetFile);
	}

	async copyTemplate(
		containerId: string,
		template: AssetTemplate,
		name: string,
	): Promise<AssetFile> {
		const { data } = await GoogleDriveAssetRepository.remote(() =>
			this.client.files.copy(
				{
					fileId: template.id,
					requestBody: {
						name,
						parents: [containerId],
						appProperties:
							GoogleDriveAssetRepository.templateProperties(template),
					},
					fields,
					supportsAllDrives: true,
				},
				requestOptions,
			),
		);
		return GoogleDriveAssetRepository.assetFile(data);
	}

	async updateFile(
		file: AssetFile,
		template: AssetTemplate,
		name: string,
	): Promise<AssetFile> {
		const { data } = await GoogleDriveAssetRepository.remote(() =>
			this.client.files.update(
				{
					fileId: file.id,
					requestBody: {
						name,
						appProperties:
							GoogleDriveAssetRepository.templateProperties(template),
					},
					fields,
					supportsAllDrives: true,
				},
				requestOptions,
			),
		);
		return GoogleDriveAssetRepository.assetFile(data);
	}

	private async list(query: string): Promise<DriveFile[]> {
		const files: DriveFile[] = [];
		let pageToken: string | undefined;
		const tokens = new Set<string>();
		do {
			const { data } = await GoogleDriveAssetRepository.remote(() =>
				this.client.files.list(
					{
						q: `${query} and trashed=false`,
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
				throw GoogleDriveAssetRepository.failure(
					"Google Drive returned an incomplete search; reconciliation was stopped",
				);
			files.push(...(data.files ?? []));
			pageToken = data.nextPageToken || undefined;
			if (pageToken && tokens.has(pageToken))
				throw GoogleDriveAssetRepository.failure(
					"Google Drive returned a repeated pagination token",
				);
			if (pageToken) tokens.add(pageToken);
		} while (pageToken);
		return files;
	}

	static createGoogleDriveAssetRepository(
		credentialsJson: string,
		options: GoogleDriveAssetOptions,
	): GoogleDriveAssetRepository {
		let credentials: {
			type?: unknown;
			client_email?: unknown;
			private_key?: unknown;
		};
		try {
			credentials = JSON.parse(credentialsJson);
		} catch {
			throw GoogleDriveAssetRepository.failure(
				"Invalid Google service-account credentials",
			);
		}
		if (
			credentials?.type !== "service_account" ||
			typeof credentials.client_email !== "string" ||
			!credentials.client_email ||
			typeof credentials.private_key !== "string" ||
			!credentials.private_key
		) {
			throw GoogleDriveAssetRepository.failure(
				"Invalid Google service-account credentials",
			);
		}
		// Only the expected service-account fields cross the boundary. Arbitrary
		// credential configurations cannot select an external token endpoint.
		const authentication = new auth.JWT({
			email: credentials.client_email,
			key: credentials.private_key,
			scopes: ["https://www.googleapis.com/auth/drive"],
		});
		return new GoogleDriveAssetRepository(
			drive({ version: "v3", auth: authentication }),
			options,
		);
	}

	private static key(request: EnsureAssetContainerRequest): string {
		return createHash("sha256").update(request.idempotencyKey).digest("hex");
	}

	private static escapeQuery(value: string): string {
		return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
	}

	private static templateProperties(
		template: AssetTemplate,
	): Record<string, string> {
		return { template_file_id: template.id, template_kind: template.kind };
	}

	private static container(file: DriveFile, eventId: string): AssetContainer {
		if (!file.id || !file.name)
			throw GoogleDriveAssetRepository.failure(
				"Google Drive returned an invalid asset folder",
			);
		return {
			id: file.id,
			name: file.name,
			url: `https://drive.google.com/drive/folders/${file.id}`,
			eventId,
		};
	}

	private static assetFile(file: DriveFile): AssetFile {
		if (!file.id || !file.name)
			throw GoogleDriveAssetRepository.failure(
				"Google Drive returned an invalid asset file",
			);
		return {
			id: file.id,
			name: file.name,
			...(file.webViewLink ? { url: file.webViewLink } : {}),
			templateId: file.appProperties?.template_file_id,
			kind: file.appProperties?.template_kind,
		};
	}

	private static failure(message: string): GoogleDriveAssetRepositoryError {
		return new GoogleDriveAssetRepositoryError(message);
	}

	private static async remote<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			const status = (error as { response?: { status?: number } } | null)
				?.response?.status;
			if (status === 429)
				throw GoogleDriveAssetRepository.failure(
					"Google Drive rate limit reached; retry reconciliation later",
				);
			if (status === 401 || status === 403)
				throw GoogleDriveAssetRepository.failure(
					"Google Drive denied access; check credentials, folder access, and quota",
				);
			throw GoogleDriveAssetRepository.failure(
				"Google Drive request failed; inspect provider state before retrying an uncertain write",
			);
		}
	}
}
