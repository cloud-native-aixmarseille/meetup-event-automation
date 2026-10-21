/** Allocation cannot proceed until the catalog's reserved identities are known. */
export class SpeakerCatalogHistoryError extends Error {
	constructor() {
		super("Speaker catalog allocation history is unavailable.");
		this.name = "SpeakerCatalogHistoryError";
	}
}
