import type { OrganizerApproval } from "../ports/organizer-approval.js";
import type { OrganizerReadinessNotification } from "../ports/organizer-readiness-notification.js";
import type {
	MailRecipient,
	CommunicationClock,
	ReconcileCommunications,
} from "@meetup-automation/communication";
import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import type { ReferentialRepository } from "@meetup-automation/referential";
import type { FeedbackTalkResultsGateway } from "@meetup-automation/publication";
import type { AutomationConfig } from "../config/automation-config.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";

export interface ManageMeetupCommunicationsDependencies {
	readonly feedbackResults: FeedbackTalkResultsGateway;
	readonly config: AutomationConfig;
	readonly organizerApproval: OrganizerApproval;
	readonly organizerReadinessNotification: OrganizerReadinessNotification;
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
