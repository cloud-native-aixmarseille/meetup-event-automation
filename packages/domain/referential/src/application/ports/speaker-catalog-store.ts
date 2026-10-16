import type { RawReferentialCatalog } from "../../domain/referential-catalog.js";
import type { SpeakerCsvRow, SpeakerSyncState } from "./proposal-source.js";

export interface SpeakerCatalogDocument {
	readonly revision: string;
	readonly columns: readonly string[];
	readonly rows: readonly SpeakerCsvRow[];
	readonly state: SpeakerSyncState;
}
export interface SpeakerCatalogStore {
	read(): Promise<SpeakerCatalogDocument>;
	candidate(rows: readonly SpeakerCsvRow[]): Promise<RawReferentialCatalog>;
	save(
		original: SpeakerCatalogDocument,
		rows: readonly SpeakerCsvRow[],
		state: SpeakerSyncState,
	): Promise<boolean>;
}
