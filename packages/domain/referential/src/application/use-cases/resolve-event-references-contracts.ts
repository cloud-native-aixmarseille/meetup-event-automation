import type { ReferentialIdentifiers } from "../../domain/identifiers.js";
import type { ReferentialCatalogOperations } from "../../domain/referential-catalog.js";
import type { ReferentialDiagnostics } from "../../domain/referential-diagnostic.js";
export interface ResolveEventReferencesCollaborators {
	readonly referentialDiagnostics: Pick<
		ReferentialDiagnostics,
		"freezeDiagnostics" | "diagnostic"
	>;
	readonly referentialIdentifiers: Pick<
		ReferentialIdentifiers,
		"asHostId" | "asSpeakerId"
	>;
	readonly referentialCatalogOperations: Pick<
		ReferentialCatalogOperations,
		"displayNameKey" | "normalizeDisplayName"
	>;
}
