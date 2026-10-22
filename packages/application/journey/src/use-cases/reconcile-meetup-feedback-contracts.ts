import type {
	EventDocumentCodec,
	EventDocumentConcurrency,
	EventRepository,
	EventRepositoryPatches,
} from "@meetup-automation/event";
import type {
	FeedbackEventGateway,
	FeedbackPolicy,
} from "@meetup-automation/publication";
import type { FeedbackAgendaProjection } from "./feedback-agenda-projection.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";
export interface FeedbackDependencies {
	readonly eventRepository: EventRepository;
	readonly documentCodec: EventDocumentCodec;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly events: FeedbackEventGateway;
}
export interface ReconcileMeetupFeedbackCollaborators {
	readonly feedbackPolicy: Pick<FeedbackPolicy, "validDate" | "pollUrl">;
	readonly feedbackAgendaProjection: Pick<FeedbackAgendaProjection, "create">;
	readonly eventRepositoryPatches: Pick<
		EventRepositoryPatches,
		"eventRepositoryPatchIsEmpty"
	>;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"ensureEventDocumentIsCurrent"
	>;
}
