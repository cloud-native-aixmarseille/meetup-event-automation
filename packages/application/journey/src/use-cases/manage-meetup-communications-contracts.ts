import type {
	CommunicationClock,
	MailRecipient,
	ReconcileCommunications,
} from "@meetup-automation/communication";
import type {
	EventDocumentCodec,
	EventDocumentConcurrency,
	EventRepository,
} from "@meetup-automation/event";
import type { FeedbackTalkResultsGateway } from "@meetup-automation/publication";
import type { ReferentialRepository } from "@meetup-automation/referential";
import type { AutomationConfig } from "../config/automation-config.js";
import type { OrganizerApproval } from "../ports/organizer-approval.js";
import type { EventCopyApprovalGate } from "../event/event-copy-approval-gate.js";
import type {
	ApproveCommunicationBatch,
	ApproveCommunicationBatchArguments,
} from "./approve-communication-batch.js";
import type { CommunicationChecklist } from "./communication-checklist.js";
import type {
	CommunicationDeliveryPreparation,
	CommunicationDeliveryPreparationArguments,
} from "./communication-delivery-preparation.js";
import type { CommunicationDispatchPolicy } from "./communication-dispatch-policy.js";
import type { CommunicationJourneyResults } from "./communication-journey-results.js";
import type { CommunicationPlaceholders } from "./communication-placeholders.js";
import type {
	CompleteCommunicationChecklist,
	CompleteCommunicationChecklistArguments,
} from "./complete-communication-checklist.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";

export interface ManageMeetupCommunicationsDependencies {
	readonly contentGate: Pick<EventCopyApprovalGate, "blocked">;
	readonly feedbackResults: FeedbackTalkResultsGateway;
	readonly config: AutomationConfig;
	readonly organizerApproval: OrganizerApproval;
	readonly clock: CommunicationClock;
	readonly eventRepository: EventRepository;
	readonly referentialRepository: ReferentialRepository;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly eventDocumentCodec: EventDocumentCodec;
	readonly reconcileCommunications: (
		dispatchAuthorized: boolean,
	) => Pick<ReconcileCommunications, "execute">;
}

export type MailRecipientResolution = Readonly<{
	resolved: boolean;
	recipients: readonly MailRecipient[];
}>;

export const UNRESOLVED_MAIL_RECIPIENTS: MailRecipientResolution =
	Object.freeze({
		resolved: false,
		recipients: Object.freeze([]),
	});

/** Coordinate event readiness, checklist completion and delivery through owned ports. */
export interface ManageMeetupCommunicationsCollaborators {
	readonly communicationDispatchPolicy: Pick<
		CommunicationDispatchPolicy,
		"isDispatchEnabled"
	>;
	readonly communicationJourneyResults: Pick<
		CommunicationJourneyResults,
		"skippedResult" | "emptyCommunicationResult" | "withRuntimeDiagnostics"
	>;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"eventDocumentsEqual"
	>;
	readonly communicationChecklist: Pick<
		CommunicationChecklist,
		"pendingRecipients"
	>;
	readonly communicationPlaceholders: Pick<
		CommunicationPlaceholders,
		"eventPlaceholders"
	>;
	readonly createCommunicationDeliveryPreparation: (
		...args: CommunicationDeliveryPreparationArguments
	) => CommunicationDeliveryPreparation;
	readonly createApproveCommunicationBatch: (
		...args: ApproveCommunicationBatchArguments
	) => ApproveCommunicationBatch;
	readonly createCompleteCommunicationChecklist: (
		...args: CompleteCommunicationChecklistArguments
	) => CompleteCommunicationChecklist;
}
