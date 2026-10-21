import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { EventDomainComposition } from "@meetup-automation/event";
import {
	PublicationDomainComposition,
	type PublicationUrlPolicy,
	type PublicationUrlPolicyEngine,
} from "@meetup-automation/publication";
import { ReferentialDomainComposition } from "@meetup-automation/referential";
import { JourneyPolicyComposition } from "./policy-composition.js";
import {
	AssetRenderProjection,
	type AssetRenderProjectionArguments,
} from "./use-cases/asset-render-projection.js";
import {
	FindNextAssetEvent,
	type FindNextAssetEventArguments,
} from "./use-cases/find-next-asset-event.js";
import {
	ManageMeetupAssets,
	type ManageMeetupAssetsArguments,
} from "./use-cases/manage-meetup-assets.js";
import {
	ManageMeetupAttention,
	type ManageMeetupAttentionArguments,
} from "./use-cases/manage-meetup-attention.js";
import {
	ManageMeetupEvent,
	type ManageMeetupEventArguments,
} from "./use-cases/manage-meetup-event.js";
import {
	ManageMeetupFeedback,
	type ManageMeetupFeedbackArguments,
} from "./use-cases/manage-meetup-feedback.js";
import {
	ManageMeetupPublication,
	type ManageMeetupPublicationArguments,
} from "./use-cases/manage-meetup-publication.js";
import {
	MeetupPublicationApproval,
	type MeetupPublicationApprovalArguments,
} from "./use-cases/meetup-publication-approval.js";
import {
	ReconcileOrganizerFeedback,
	type ReconcileOrganizerFeedbackArguments,
} from "./use-cases/reconcile-organizer-feedback.js";
import {
	RefreshSelectedProposals,
	type RefreshSelectedProposalsArguments,
} from "./use-cases/refresh-selected-proposals.js";
import {
	SynchronizeMeetupIssueForm,
	type SynchronizeMeetupIssueFormArguments,
} from "./use-cases/synchronize-meetup-issue-form.js";
import {
	SynchronizeSourceSpeakers,
	type SynchronizeSourceSpeakersArguments,
} from "./use-cases/synchronize-source-speakers.js";
import {
	ValidateMeetupReferentials,
	type ValidateMeetupReferentialsArguments,
} from "./use-cases/validate-meetup-referentials.js";
export class JourneyComposition {
	assetRenderProjection(
		...args: AssetRenderProjectionArguments
	): AssetRenderProjection {
		return new AssetRenderProjection(
			{
				assetParticipantProjection:
					new JourneyPolicyComposition().assetParticipantProjection(),
				publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			...args,
		);
	}
	findNextAssetEvent(
		meetupEventUrlPolicy: Pick<PublicationUrlPolicy, "evaluate">,
		communityEventUrlPolicy: Pick<PublicationUrlPolicy, "evaluate">,
		...args: FindNextAssetEventArguments
	): FindNextAssetEvent {
		return new FindNextAssetEvent(
			{
				eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
				meetupEventUrlPolicy,
				communityEventUrlPolicy,
				meetupPublicationChecklist:
					new EventDomainComposition().meetupPublicationChecklist(),
				createEventRuleEngine: (...args) =>
					new EventDomainComposition().eventRuleEngine(...args),
			},
			...args,
		);
	}
	manageMeetupAssets(...args: ManageMeetupAssetsArguments): ManageMeetupAssets {
		return new ManageMeetupAssets(
			{
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				eventRepositoryPatches:
					new EventDomainComposition().eventRepositoryPatches(),
			},
			...args,
		);
	}
	manageMeetupAttention(
		publicationUrlPolicyEngine: Pick<PublicationUrlPolicyEngine, "evaluate">,
		...args: ManageMeetupAttentionArguments
	): ManageMeetupAttention {
		return new ManageMeetupAttention(
			{
				attentionEventFacts: new JourneyPolicyComposition().attentionEventFacts(
					publicationUrlPolicyEngine,
				),
				evaluateAttention:
					new CommunicationDomainComposition().evaluateAttention(),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				postEventPolicy: new CommunicationDomainComposition().postEventPolicy(),
			},
			...args,
		);
	}
	manageMeetupEvent(
		publicationUrlPolicyEngine: Pick<PublicationUrlPolicyEngine, "evaluate">,
		...args: ManageMeetupEventArguments
	): ManageMeetupEvent {
		return new ManageMeetupEvent(
			{
				eventPublicationEvaluation:
					new JourneyPolicyComposition().eventPublicationEvaluation(
						publicationUrlPolicyEngine,
					),
				eventReadinessPolicy:
					new EventDomainComposition().eventReadinessPolicy(),
				eventLifecycle: new EventDomainComposition().eventLifecycle(),
				eventDiagnosticProjection:
					new JourneyPolicyComposition().eventDiagnosticProjection(),
				eventParticipantResolution:
					new JourneyPolicyComposition().eventParticipantResolution(),
				eventRepositoryPatches:
					new EventDomainComposition().eventRepositoryPatches(),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				createReconcileEvent: (...args) =>
					new EventDomainComposition().reconcileEvent(...args),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
				createRefreshSelectedProposals: (...args) =>
					this.refreshSelectedProposals(...args),
				resolveEventReferences:
					new ReferentialDomainComposition().resolveEventReferences(),
			},
			...args,
		);
	}
	manageMeetupFeedback(
		...args: ManageMeetupFeedbackArguments
	): ManageMeetupFeedback {
		return new ManageMeetupFeedback(
			{
				feedbackPolicy: new PublicationDomainComposition().feedbackPolicy(),
				feedbackAgendaProjection:
					new JourneyPolicyComposition().feedbackAgendaProjection(),
				eventRepositoryPatches:
					new EventDomainComposition().eventRepositoryPatches(),
				feedbackLinkSelection:
					new PublicationDomainComposition().feedbackLinkSelection(),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
			},
			...args,
		);
	}
	manageMeetupPublication(
		...args: ManageMeetupPublicationArguments
	): ManageMeetupPublication {
		return new ManageMeetupPublication(
			{
				diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
				meetupPublicationProjection:
					new JourneyPolicyComposition().meetupPublicationProjection(),
				scheduledEventPolicy:
					new PublicationDomainComposition().scheduledEventPolicy(),
				meetupPublicationChecklist:
					new EventDomainComposition().meetupPublicationChecklist(),
				eventRepositoryPatches:
					new EventDomainComposition().eventRepositoryPatches(),
				eventDocumentConcurrency:
					new EventDomainComposition().eventDocumentConcurrency(),
				createMeetupPublicationApproval: (...args) =>
					this.meetupPublicationApproval(...args),
			},
			...args,
		);
	}
	meetupPublicationApproval(
		...args: MeetupPublicationApprovalArguments
	): MeetupPublicationApproval {
		return new MeetupPublicationApproval(
			{
				meetupPublicationRevision:
					new JourneyPolicyComposition().meetupPublicationRevision(),
			},
			...args,
		);
	}
	reconcileOrganizerFeedback(
		...args: ReconcileOrganizerFeedbackArguments
	): ReconcileOrganizerFeedback {
		return new ReconcileOrganizerFeedback(
			{
				attentionStageEvaluation:
					new JourneyPolicyComposition().attentionStageEvaluation(),
			},
			...args,
		);
	}
	refreshSelectedProposals(
		...args: RefreshSelectedProposalsArguments
	): RefreshSelectedProposals {
		return new RefreshSelectedProposals(...args);
	}
	synchronizeMeetupIssueForm(
		...args: SynchronizeMeetupIssueFormArguments
	): SynchronizeMeetupIssueForm {
		return new SynchronizeMeetupIssueForm(...args);
	}
	synchronizeSourceSpeakers(
		...args: SynchronizeSourceSpeakersArguments
	): SynchronizeSourceSpeakers {
		return new SynchronizeSourceSpeakers(
			{
				speakerSynchronizationStageRunner:
					new JourneyPolicyComposition().speakerSynchronizationStageRunner(),
				mergeSourceSpeakers:
					new ReferentialDomainComposition().mergeSourceSpeakers(),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			...args,
		);
	}
	validateMeetupReferentials(
		...args: ValidateMeetupReferentialsArguments
	): ValidateMeetupReferentials {
		return new ValidateMeetupReferentials(
			{
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			...args,
		);
	}
}
