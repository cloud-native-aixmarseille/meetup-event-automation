import { auth } from "@googleapis/drive";
import { GoogleDriveAssetRepositoryError } from "./google-drive-asset-repository-error.js";
export class GoogleDriveAuthentication {
	static create(credentialsJson: string) {
		let credentials: {
			type?: unknown;
			client_email?: unknown;
			private_key?: unknown;
		};
		try {
			credentials = JSON.parse(credentialsJson);
		} catch {
			throw new GoogleDriveAssetRepositoryError(
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
			throw new GoogleDriveAssetRepositoryError(
				"Invalid Google service-account credentials",
			);
		}
		// Only the expected service-account fields cross the boundary. Arbitrary
		// credential configurations cannot select an external token endpoint.
		return new auth.JWT({
			email: credentials.client_email,
			key: credentials.private_key,
			scopes: ["https://www.googleapis.com/auth/drive"],
		});
	}
}
