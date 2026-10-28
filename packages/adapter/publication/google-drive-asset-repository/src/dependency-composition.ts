import { setTimeout } from "node:timers/promises";
import { drive } from "@googleapis/drive";
import { ContentFingerprint } from "@meetup-automation/publication";
import { DriveAssetMetadata } from "./drive-asset-metadata.js";
import { DriveBoundedStream } from "./drive-bounded-stream.js";
import { DrivePdfBinary } from "./drive-pdf-binary.js";
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
import { GoogleDrivePdfDownload } from "./google-drive-pdf-download.js";
import { GoogleDrivePdfComposition } from "./pdf-export-composition.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GoogleDriveAssetRepositoryComposition {
	googleDrivePdf(credentialsJson: string, publicFolderId: string) {
		const authentication =
			this.googleDriveAuthentication().create(credentialsJson);
		const client = drive({ version: "v3", auth: authentication });
		return new GoogleDrivePdfComposition(
			client,
			publicFolderId,
			new GoogleDrivePdfDownload(
				client,
				async () => (await authentication.getAccessToken()).token,
				fetch,
				setTimeout,
				Date.now,
				new DrivePdfBinary(new DriveBoundedStream(), new ContentFingerprint()),
			),
		);
	}
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
