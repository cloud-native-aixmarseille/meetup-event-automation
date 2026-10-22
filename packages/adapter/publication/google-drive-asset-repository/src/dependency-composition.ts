import { DriveAssetMetadata } from "./drive-asset-metadata.js";
import {
	GoogleDriveAssetRepository,
	type GoogleDriveAssetRepositoryArguments,
} from "./google-drive-asset-repository.js";
import { GoogleDriveAssetRepositoryFactory } from "./google-drive-asset-repository-factory.js";
import { GoogleDriveAuthentication } from "./google-drive-authentication.js";
import {
	GoogleDriveManifestRepository,
	type GoogleDriveManifestRepositoryArguments,
} from "./google-drive-manifest-repository.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GoogleDriveAssetRepositoryComposition {
	driveAssetMetadata(): DriveAssetMetadata {
		return new DriveAssetMetadata();
	}
	googleDriveAssetRepository(
		...args: GoogleDriveAssetRepositoryArguments
	): GoogleDriveAssetRepository {
		return new GoogleDriveAssetRepository(
			{ driveAssetMetadata: this.driveAssetMetadata() },
			...args,
		);
	}
	googleDriveAssetRepositoryFactory(): GoogleDriveAssetRepositoryFactory {
		return new GoogleDriveAssetRepositoryFactory({
			googleDriveAuthentication: this.googleDriveAuthentication(),
			createGoogleDriveAssetRepository: (...args) =>
				this.googleDriveAssetRepository(...args),
		});
	}
	googleDriveAuthentication(): GoogleDriveAuthentication {
		return new GoogleDriveAuthentication();
	}
	googleDriveManifestRepository(
		...args: GoogleDriveManifestRepositoryArguments
	): GoogleDriveManifestRepository {
		return new GoogleDriveManifestRepository(...args);
	}
}
