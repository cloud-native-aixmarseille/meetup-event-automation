import type { EventDiagnostic } from "../../domain/diagnostic.js";
import type { EventLifecycleEvaluation } from "../../domain/lifecycle.js";
import type { EventIdentity, MeetupEvent } from "../../domain/model.js";
import type { EventPatch } from "../../domain/patch.js";
import type { EventReadiness } from "../../domain/readiness.js";
import type { EventRule } from "../../domain/rule-contracts.js";
import type { EventClock } from "../ports/event-clock.js";
import type { EventCommentRepository } from "../ports/event-comment-repository.js";
import type { EventDocumentCodec } from "../ports/event-document-codec.js";
import type {
	EventDocument,
	EventRepository,
	EventRepositoryPatch,
} from "../ports/event-repository.js";

export type ReconcileEventMode = "check" | "fix";

export type ReconcileEventInput = Readonly<{
	identity: EventIdentity;
	mode: ReconcileEventMode;
	/** A caller may supply one already-loaded snapshot to avoid a stale double read. */
	sourceDocument?: EventDocument;
}>;

export type ReconcileEventResult = Readonly<{
	event: MeetupEvent;
	diagnostics: readonly EventDiagnostic[];
	normalizationPatch: EventPatch;
	repositoryPatch: EventRepositoryPatch;
	readiness: EventReadiness;
	lifecycle: EventLifecycleEvaluation;
	persisted: boolean;
	commentUpdated: boolean;
}>;

export type ReconcileEventDependencies = Readonly<{
	repository: EventRepository;
	documentCodec: EventDocumentCodec;
	commentRepository: EventCommentRepository;
	clock: EventClock;
	rules?: readonly EventRule[];
}>;
