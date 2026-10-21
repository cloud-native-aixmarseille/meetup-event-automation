import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { EventDomainComposition } from "@meetup-automation/event";
import { ReferentialDomainComposition } from "@meetup-automation/referential";
import { JourneyPolicyComposition } from "./policy-composition.js";
import {
	ApproveCommunicationBatch,
	type ApproveCommunicationBatchArguments,
} from "./use-cases/approve-communication-batch.js";
import {
	CommunicationDeliveryPreparation,
	type CommunicationDeliveryPreparationArguments,
} from "./use-cases/communication-delivery-preparation.js";
import {
	CompleteCommunicationChecklist,
	type CompleteCommunicationChecklistArguments,
} from "./use-cases/complete-communication-checklist.js";
import {
	ManageMeetupCommunications,
	type ManageMeetupCommunicationsArguments,
} from "./use-cases/manage-meetup-communications.js";
import {
	SpeakerFeedbackPreparation,
	type SpeakerFeedbackPreparationArguments,
} from "./use-cases/speaker-feedback-preparation.js";
export class JourneyCommunicationComposition {
	approveCommunicationBatch(
		...args: ApproveCommunicationBatchArguments
	): ApproveCommunicationBatch {
		return new ApproveCommunicationBatch(
			{
				mailBatchFingerprint:
					new CommunicationDomainComposition().mailBatchFingerprint(),
				communicationApprovalDetails:
					new JourneyPolicyComposition().communicationApprovalDetails(),
				createPlanCommunications: (...args) =>
					new CommunicationDomainComposition().planCommunications(...args),
			},
			...args,
		);
	}
	communicationDeliveryPreparation(
		...args: CommunicationDeliveryPreparationArguments
	): CommunicationDeliveryPreparation {
		return new CommunicationDeliveryPreparation(
			{
				postEventPolicy: new CommunicationDomainComposition().postEventPolicy(),
				communicationRecipients:
					new JourneyPolicyComposition().communicationRecipients(),
				createSpeakerFeedbackPreparation: (...args) =>
					this.speakerFeedbackPreparation(...args),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			...args,
		);
	}
	completeCommunicationChecklist(
		...args: CompleteCommunicationChecklistArguments
	): CompleteCommunicationChecklist {
		return new CompleteCommunicationChecklist(
			{
				communicationChecklist:
					new JourneyPolicyComposition().communicationChecklist(),
				eventChecklists: new EventDomainComposition().eventChecklists(),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
			},
			...args,
		);
	}
	manageMeetupCommunications(
		...args: ManageMeetupCommunicationsArguments
	): ManageMeetupCommunications {
		return new ManageMeetupCommunications(
			{
				communicationDispatchPolicy:
					new JourneyPolicyComposition().communicationDispatchPolicy(),
				communicationJourneyResults:
					new JourneyPolicyComposition().communicationJourneyResults(),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				communicationChecklist:
					new JourneyPolicyComposition().communicationChecklist(),
				communicationPlaceholders:
					new JourneyPolicyComposition().communicationPlaceholders(),
				createCommunicationDeliveryPreparation: (...args) =>
					this.communicationDeliveryPreparation(...args),
				createApproveCommunicationBatch: (...args) =>
					this.approveCommunicationBatch(...args),
				createCompleteCommunicationChecklist: (...args) =>
					this.completeCommunicationChecklist(...args),
			},
			...args,
		);
	}
	speakerFeedbackPreparation(
		...args: SpeakerFeedbackPreparationArguments
	): SpeakerFeedbackPreparation {
		return new SpeakerFeedbackPreparation(
			{
				communicationChecklist:
					new JourneyPolicyComposition().communicationChecklist(),
				feedbackAgendaProjection:
					new JourneyPolicyComposition().feedbackAgendaProjection(),
			},
			...args,
		);
	}
}
