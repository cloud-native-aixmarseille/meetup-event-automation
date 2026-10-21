import type { RawReferentialCatalog } from "../../domain/referential-catalog.js";
import type { SpeakerCatalogEntry } from "../../domain/speaker-catalog-entry.js";

export interface SpeakerCatalogDocument {
	readonly revision: string;
	readonly entries: readonly SpeakerCatalogEntry[];
	readonly reservedIds: readonly string[];
}
export interface SpeakerCatalogStore {
	read(): Promise<SpeakerCatalogDocument>;
	candidate(
		entries: readonly SpeakerCatalogEntry[],
	): Promise<RawReferentialCatalog>;
	save(
		original: SpeakerCatalogDocument,
		entries: readonly SpeakerCatalogEntry[],
		reservedIds: readonly string[],
	): Promise<boolean>;
}
