import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { EventDomainComposition } from "@meetup-automation/event";
import {
	PublicationDomainComposition,
	type PublicationUrlPolicyEngine,
} from "@meetup-automation/publication";
import { ReferentialDomainComposition } from "@meetup-automation/referential";
import { ApprovalRequestPolicy } from "./approval/approval-request-policy.js";
import { MeetupPublicationRevision } from "./approval/meetup-publication-revision.js";
import { CommunicationDiagnosticProjection } from "./communication/communication-diagnostic-projection.js";
import { AutomationConfigFactory } from "./config/automation-config.js";
import { AttentionStageEvaluation } from "./result/attention-stage-evaluation.js";
import { DiagnosticPolicy } from "./result/diagnostic-policy.js";
import { OrganizerDiagnosticPolicy } from "./result/organizer-diagnostic-policy.js";
import { AssetParticipantProjection } from "./use-cases/asset-participant-projection.js";
import { AttentionEventFacts } from "./use-cases/attention-event-facts.js";
import { CommunicationApprovalDetails } from "./use-cases/communication-approval-details.js";
import { CommunicationChecklist } from "./use-cases/communication-checklist.js";
import { CommunicationDispatchPolicy } from "./use-cases/communication-dispatch-policy.js";
import { CommunicationJourneyResults } from "./use-cases/communication-journey-results.js";
import { CommunicationPlaceholders } from "./use-cases/communication-placeholders.js";
import { CommunicationRecipients } from "./use-cases/communication-recipients.js";
import { EventDiagnosticProjection } from "./use-cases/event-diagnostic-projection.js";
import { EventParticipantResolution } from "./use-cases/event-participant-resolution.js";
import { EventPublicationEvaluation } from "./use-cases/event-publication-evaluation.js";
import { FeedbackAgendaProjection } from "./use-cases/feedback-agenda-projection.js";
import { MeetupPublicationProjection } from "./use-cases/meetup-publication-projection.js";
import { SpeakerSynchronizationStageRunner } from "./use-cases/speaker-synchronization-stage-runner.js";
export class JourneyPolicyComposition {
	approvalRequestPolicy(): ApprovalRequestPolicy {
		return new ApprovalRequestPolicy();
	}
	assetParticipantProjection(): AssetParticipantProjection {
		return new AssetParticipantProjection({
			publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
		});
	}
	attentionEventFacts(
		publicationUrlPolicyEngine: Pick<PublicationUrlPolicyEngine, "evaluate">,
	): AttentionEventFacts {
		return new AttentionEventFacts({
			eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
			eventPublicationEvaluation: this.eventPublicationEvaluation(
				publicationUrlPolicyEngine,
			),
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
			communicationChecklist: this.communicationChecklist(),
			createEventRuleEngine: (...args) =>
				new EventDomainComposition().eventRuleEngine(...args),
		});
	}
	attentionStageEvaluation(): AttentionStageEvaluation {
		return new AttentionStageEvaluation({
			diagnosticPolicy: this.diagnosticPolicy(),
			organizerDiagnosticPolicy: this.organizerDiagnosticPolicy(),
		});
	}
	automationConfigFactory(): AutomationConfigFactory {
		return new AutomationConfigFactory();
	}
	communicationApprovalDetails(): CommunicationApprovalDetails {
		return new CommunicationApprovalDetails();
	}
	communicationChecklist(): CommunicationChecklist {
		return new CommunicationChecklist();
	}
	communicationDiagnosticProjection(): CommunicationDiagnosticProjection {
		return new CommunicationDiagnosticProjection();
	}
	communicationDispatchPolicy(): CommunicationDispatchPolicy {
		return new CommunicationDispatchPolicy();
	}
	communicationJourneyResults(): CommunicationJourneyResults {
		return new CommunicationJourneyResults();
	}
	communicationPlaceholders(): CommunicationPlaceholders {
		return new CommunicationPlaceholders({
			presentationFileUrl:
				new PublicationDomainComposition().presentationFileUrl(),
			meetupPublicationChecklist:
				new EventDomainComposition().meetupPublicationChecklist(),
		});
	}
	communicationRecipients(): CommunicationRecipients {
		return new CommunicationRecipients({
			resolveEventReferences:
				new ReferentialDomainComposition().resolveEventReferences(),
		});
	}

	diagnosticPolicy(): DiagnosticPolicy {
		return new DiagnosticPolicy();
	}
	eventDiagnosticProjection(): EventDiagnosticProjection {
		return new EventDiagnosticProjection();
	}
	eventParticipantResolution(): EventParticipantResolution {
		return new EventParticipantResolution();
	}
	eventPublicationEvaluation(
		publicationUrlPolicyEngine: Pick<PublicationUrlPolicyEngine, "evaluate">,
	): EventPublicationEvaluation {
		return new EventPublicationEvaluation({
			meetupPublicationChecklist:
				new EventDomainComposition().meetupPublicationChecklist(),
			publicationUrlPolicyEngine,
			manualPublicationPolicy:
				new PublicationDomainComposition().manualPublicationPolicy(),
		});
	}
	feedbackAgendaProjection(): FeedbackAgendaProjection {
		return new FeedbackAgendaProjection();
	}
	meetupPublicationProjection(): MeetupPublicationProjection {
		return new MeetupPublicationProjection();
	}
	meetupPublicationRevision(): MeetupPublicationRevision {
		return new MeetupPublicationRevision({
			contentFingerprint:
				new PublicationDomainComposition().contentFingerprint(),
		});
	}
	organizerDiagnosticPolicy(): OrganizerDiagnosticPolicy {
		return new OrganizerDiagnosticPolicy({
			diagnosticPolicy: this.diagnosticPolicy(),
		});
	}
	speakerSynchronizationStageRunner(): SpeakerSynchronizationStageRunner {
		return new SpeakerSynchronizationStageRunner();
	}
}
