import type { Speaker } from "./referential-catalog.js";

/** Editable catalog facts, independent of the storage format and its columns. */
export interface SpeakerCatalogEntry {
	readonly id: string;
	readonly firstName: string;
	readonly lastName: string;
	readonly phone: string;
	readonly displayName: string;
	readonly email: string;
	readonly company: string;
	readonly pictureUrl: string;
	readonly sourceIdentity?: NonNullable<Speaker["sourceIdentity"]>;
}
