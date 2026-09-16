import type {
	CommunicationApprovalRepository,
	MailRecipient,
	ReconcileCommunications,
} from "@meetup-automation/communication";
import type { EventRepository } from "@meetup-automation/event";
import type { ReferentialRepository } from "@meetup-automation/referential";
import type { AutomationConfig } from "../config/automation-config.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";

export interface ManageMeetupCommunicationsDependencies {
	readonly config: AutomationConfig;
	readonly eventRepository: EventRepository;
	readonly referentialRepository: ReferentialRepository;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly approvalRepository: CommunicationApprovalRepository;
	readonly actorCanApprove: (actor: string) => Promise<boolean>;
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
