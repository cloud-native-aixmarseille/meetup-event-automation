import { drive } from "@googleapis/drive";
import type {
	GoogleDriveAssetRepository,
	GoogleDriveAssetRepositoryArguments,
} from "./google-drive-asset-repository.js";
import type {
	GoogleDriveAssetOptions,
	GoogleDriveClient,
} from "./google-drive-asset-repository-contracts.js";
import type { GoogleDriveAuthentication } from "./google-drive-authentication.js";

export interface GoogleDriveAssetRepositoryFactoryCollaborators {
	readonly googleDriveAuthentication: Pick<GoogleDriveAuthentication, "create">;
	readonly createGoogleDriveAssetRepository: (
		...args: GoogleDriveAssetRepositoryArguments
	) => GoogleDriveAssetRepository;
}

export class GoogleDriveAssetRepositoryFactory {
	constructor(
		private readonly collaborators: GoogleDriveAssetRepositoryFactoryCollaborators,
	) {}

	createGoogleDriveAssetRepository(
		credentialsJson: string,
		options: GoogleDriveAssetOptions,
	): GoogleDriveAssetRepository {
		return this.collaborators.createGoogleDriveAssetRepository(
			this.client(credentialsJson),
			options,
		);
	}
	client(credentialsJson: string): GoogleDriveClient {
		return drive({
			version: "v3",
			auth: this.collaborators.googleDriveAuthentication.create(
				credentialsJson,
			),
		});
	}
}
