export { ApprovalNotificationPolicy } from "./approval/approval-notification-policy.js";
export { ApprovalRequestPolicy } from "./approval/approval-request-policy.js";
export { FollowUpApprovalPolicy } from "./approval/follow-up-approval-policy.js";
export { CoverArtworkApprovalGate } from "./assets/cover-artwork-approval-gate.js";
export { CoverArtworkDrafts } from "./assets/cover-artwork-drafts.js";
export { GenerateCoverArtwork } from "./assets/generate-cover-artwork.js";
export { CommunicationDiagnosticProjection } from "./communication/communication-diagnostic-projection.js";
export type {
	CommunicationJourneyDiagnostic,
	ManageMeetupCommunicationsInput,
	ManageMeetupCommunicationsResult,
} from "./communication/contracts.js";
export { SocialPostDrafts } from "./communication/social-post-drafts.js";
export { JourneyCommunicationComposition } from "./communication-composition.js";
export type { AutomationConfig } from "./config/automation-config.js";
export { AutomationConfigFactory } from "./config/automation-config.js";
export { JourneyComposition } from "./dependency-composition.js";
export { DraftProposalComposition } from "./draft-proposal-composition.js";
export { ApplyEventCopy } from "./event/apply-event-copy.js";
export { EventCopyApprovalGate } from "./event/event-copy-approval-gate.js";
export { EventCopyDrafts } from "./event/event-copy-drafts.js";
export { EventPublicationComposition } from "./event-publication-composition.js";
export { JourneyPolicyComposition } from "./policy-composition.js";
export type { ContentAuthority } from "./ports/content-authority.js";
export type {
	ContentSubmission,
	ContentSubmissions,
} from "./ports/content-submissions.js";
export type { EventDocumentRevision } from "./ports/event-document-revision.js";
export type * from "./ports/generation.js";
export type {
	IssueFormProjection,
	IssueFormProjectionMode,
	IssueFormProjectionResult,
} from "./ports/issue-form-projection.js";
export type {
	ContentApprovalDetails,
	EventPublicationApprovalDetails,
	OrganizerApproval,
	OrganizerApprovalKind,
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "./ports/organizer-approval.js";
export type {
	ApprovalEmailDetail,
	ApprovalEmailLink,
	OrganizerApprovalDetails,
} from "./ports/organizer-approval-details.js";
export type {
	ApprovalNotificationFacts,
	ApprovalNotificationMessage,
	ApprovalNotificationRequest,
	ApprovalNotificationResult,
	OrganizerApprovalNotification,
} from "./ports/organizer-approval-notification.js";
export type {
	FollowUpAttentionCodec,
	FollowUpAttentionPresentation,
	FollowUpTask,
	OrganizerFollowUp,
	OrganizerFollowUpInput,
} from "./ports/organizer-follow-up.js";
export { FOLLOW_UP_TASKS } from "./ports/organizer-follow-up.js";
export * from "./proposals/content-plan-factory.js";
export * from "./proposals/content-proposal-factory.js";
export * from "./proposals/content-proposal-transition.js";
export { GenerateTextProposal } from "./proposals/generate-text-proposal.js";
export * from "./proposals/prepare-promotional-content.js";
export * from "./proposals/promotional-content.js";
export * from "./proposals/promotional-content-fingerprint.js";
export * from "./proposals/promotional-content-policy.js";
export * from "./proposals/promotional-content-ports.js";
export { PublicationDestinationComposition } from "./publication-destination-composition.js";
export { AttentionStageEvaluation } from "./result/attention-stage-evaluation.js";
export {
	ATTENTION_STAGE_OWNERS,
	type AttentionStageReport,
	type AttentionStageReports,
} from "./result/attention-stage-reports.js";
export { DiagnosticPolicy } from "./result/diagnostic-policy.js";
export { OrganizerDiagnosticPolicy } from "./result/organizer-diagnostic-policy.js";
export type { PublicDiagnostic } from "./result/result-envelope.js";
export { ApplyPromotionalContent } from "./review/apply-promotional-content.js";
export {
	ContentFactsProjection,
	type ContentSettings,
} from "./review/content-facts-projection.js";
export { ContentReview } from "./review/content-review.js";
export { ContentReviewWork } from "./review/content-review-work.js";
export {
	type ContentContext,
	ContentWorkspace,
} from "./review/content-workspace.js";
export { ManageContentReview } from "./review/manage-content-review.js";
export { SubmitPromotionalContent } from "./review/submit-promotional-content.js";
export { AssetRenderProjection } from "./use-cases/asset-render-projection.js";
export { CommunicationJourneyResults } from "./use-cases/communication-journey-results.js";
export type { CommunityPublicationSettings } from "./use-cases/community-publication-projection.js";
export type * from "./use-cases/event-publication-contracts.js";
export { FindNextAssetEvent } from "./use-cases/find-next-asset-event.js";
export { ManageMeetupAttention } from "./use-cases/manage-meetup-attention.js";
export { ManageMeetupCommunications } from "./use-cases/manage-meetup-communications.js";
export { ManageMeetupEvent } from "./use-cases/manage-meetup-event.js";
export type {
	ManageMeetupEventDependencies,
	ManageMeetupEventResult,
} from "./use-cases/manage-meetup-event-contracts.js";
export { ReconcileEventPublications } from "./use-cases/reconcile-event-publications.js";
export { ReconcileFeedbackLink } from "./use-cases/reconcile-feedback-link.js";
export { ReconcileMeetupDocuments } from "./use-cases/reconcile-meetup-documents.js";
export { ReconcileMeetupFeedback } from "./use-cases/reconcile-meetup-feedback.js";
export type {
	ReconcileMeetupIssueFormDependencies,
	ReconcileMeetupIssueFormResult,
} from "./use-cases/reconcile-meetup-issue-form.js";
export { ReconcileMeetupIssueForm } from "./use-cases/reconcile-meetup-issue-form.js";
export {
	ReconcileMeetupSlidesPdf,
	type SlidesPdfSource,
} from "./use-cases/reconcile-meetup-slides-pdf.js";
export {
	ReconcileOrganizerFeedback,
	type ReconcileOrganizerFeedbackArguments,
} from "./use-cases/reconcile-organizer-feedback.js";
export {
	ReconcileSourceSpeakers,
	type ReconcileSourceSpeakersArguments,
} from "./use-cases/reconcile-source-speakers.js";
export type { ScheduledEventSettings } from "./use-cases/scheduled-event-projection.js";
export { SelectMeetupTopics } from "./use-cases/select-meetup-topics.js";
export { SpeakerSynchronizationError } from "./use-cases/speaker-synchronization-error.js";
export type {
	ValidateMeetupReferentialsDependencies,
	ValidateMeetupReferentialsResult,
} from "./use-cases/validate-meetup-referentials.js";
export { ValidateMeetupReferentials } from "./use-cases/validate-meetup-referentials.js";
export { ReconcileMeetupSlidesDelivery } from "./use-cases/reconcile-meetup-slides-delivery.js";

export { EventPublicationResults } from "./use-cases/event-publication-results.js";

export type { SocialPublicationApprovalDetails } from "./ports/organizer-approval.js";
export { SocialPublicationComposition } from "./social-publication-composition.js";
export {
	RecoverSocialPublication,
	type SocialRecoveryInput,
} from "./communication/recover-social-publication.js";
export { ReconcileSocialPublications } from "./communication/reconcile-social-publications.js";
export { SocialPublicationCompletion } from "./communication/social-publication-completion.js";
export type {
	SocialPublicationDependencies,
	SocialPublicationResult,
	SocialPublicationStatus,
} from "./communication/social-publication-contracts.js";

export { SocialPublicationApprovalRequest } from "./communication/social-publication-approval-request.js";
