import type {
	HostId,
	ReferentialIdentifiers,
} from "../../domain/identifiers.js";
import type {
	Host,
	HostContact,
	ReferentialCatalog,
} from "../../domain/referential-catalog.js";
import type { ReferentialDiagnostic } from "../../domain/referential-diagnostic.js";

export type ReferentialCatalogValidation =
	| Readonly<{
			isValid: true;
			catalog: ReferentialCatalog;
			diagnostics: readonly ReferentialDiagnostic[];
	  }>
	| Readonly<{
			isValid: false;
			diagnostics: readonly ReferentialDiagnostic[];
	  }>;

export interface HostBuilder {
	readonly source?: Host["source"];
	readonly id: HostId;
	readonly displayName: string;
	readonly contacts: HostContact[];
}

export interface ParsedHostRecord {
	readonly hostId: NonNullable<
		ReturnType<typeof ReferentialIdentifiers.asHostId>
	>;
	readonly displayName: string;
	readonly contact: HostContact;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
