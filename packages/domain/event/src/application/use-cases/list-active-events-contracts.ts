import type { EventDiagnostic } from "../../domain/diagnostic.js";
import type { EventLifecycleEvaluation } from "../../domain/lifecycle.js";
import type { EventIdentity, MeetupEvent } from "../../domain/model.js";
import type { EventReadiness } from "../../domain/readiness.js";
import type { EventRule } from "../../domain/rule-contracts.js";
import type { EventClock } from "../ports/event-clock.js";
import type { EventDocumentCodec } from "../ports/event-document-codec.js";
import type { EventRepository } from "../ports/event-repository.js";

export type ListActiveEventsInput = Readonly<{
	repository: string;
	label?: string;
	includeClosed?: boolean;
	pageSize?: number;
}>;

export type ActiveEvent = Readonly<{
	identity: EventIdentity;
	event: MeetupEvent;
	readiness: EventReadiness;
	lifecycle: EventLifecycleEvaluation;
}>;

export type ListActiveEventsResult = Readonly<{
	events: readonly ActiveEvent[];
	diagnostics: readonly EventDiagnostic[];
}>;

export type ListActiveEventsDependencies = Readonly<{
	repository: EventRepository;
	documentCodec: EventDocumentCodec;
	clock: EventClock;
	rules?: readonly EventRule[];
}>;
