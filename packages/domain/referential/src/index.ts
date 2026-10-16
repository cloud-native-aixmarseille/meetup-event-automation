export type { ReferentialRepository } from "./application/ports/referential-repository.js";
export {
	ProjectReferentialChoices,
	type ReferentialChoiceProjection,
} from "./application/use-cases/project-referential-choices.js";
export {
	ResolveEventReferences,
	type ResolveEventReferencesCommand,
	type ResolveEventReferencesResult,
} from "./application/use-cases/resolve-event-references.js";
export { ValidateReferentialCatalog } from "./application/use-cases/validate-referential-catalog.js";
export type { ReferentialCatalogValidation } from "./application/use-cases/validate-referential-catalog-contracts.js";
export type { ContactId, HostId, SpeakerId } from "./domain/identifiers.js";
export type {
	Host,
	HostContact,
	RawHostRecord,
	RawReferentialCatalog,
	RawSpeakerRecord,
	ReferentialCatalog,
	Speaker,
} from "./domain/referential-catalog.js";
export type {
	ReferentialDiagnostic,
	ReferentialDiagnosticCode,
	ReferentialDiagnosticSeverity,
} from "./domain/referential-diagnostic.js";

export type {
	ProposalSource,
	ProposalSnapshot,
	SourceProposal,
	SourceSpeaker,
	SpeakerCsvRow,
	SpeakerSyncState,
} from "./application/ports/proposal-source.js";
export { ProposalSourceError } from "./domain/proposal-source-error.js";
export { MergeSourceSpeakers } from "./application/use-cases/merge-source-speakers.js";
export { SourceSpeakerReferentialRepository } from "./application/use-cases/source-speaker-referential-repository.js";

export type {
	SpeakerCatalogDocument,
	SpeakerCatalogStore,
} from "./application/ports/speaker-catalog-store.js";
