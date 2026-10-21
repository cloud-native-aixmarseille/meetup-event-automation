import type {
	EventClock,
	EventDocumentCodec,
	EventDocumentConcurrency,
	EventRepository,
	EventRepositoryPatches,
} from "@meetup-automation/event";
import type {
	FeedbackEventGateway,
	FeedbackLinkGateway,
	FeedbackLinkSelection,
	FeedbackPolicy,
} from "@meetup-automation/publication";
import type { FeedbackAgendaProjection } from "./feedback-agenda-projection.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";
export interface FeedbackDependencies {
	readonly eventRepository: EventRepository;
	readonly eventLabel: string;
	readonly documentCodec: EventDocumentCodec;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly clock: EventClock;
	readonly links: FeedbackLinkGateway;
	readonly events: FeedbackEventGateway;
}
export interface ManageMeetupFeedbackCollaborators {
	readonly feedbackPolicy: Pick<
		FeedbackPolicy,
		"validDate" | "pollUrl" | "isLinkUpdateDue"
	>;
	readonly feedbackAgendaProjection: Pick<FeedbackAgendaProjection, "create">;
	readonly eventRepositoryPatches: Pick<
		EventRepositoryPatches,
		"eventRepositoryPatchIsEmpty"
	>;
	readonly feedbackLinkSelection: Pick<FeedbackLinkSelection, "conflict">;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"ensureEventDocumentIsCurrent"
	>;
}
