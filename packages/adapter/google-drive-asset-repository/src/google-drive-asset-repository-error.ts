export class GoogleDriveAssetRepositoryError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GoogleDriveAssetRepositoryError";
	}
}
