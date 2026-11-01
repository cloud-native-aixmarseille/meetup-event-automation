export type {
	AttentionChecklist,
	AttentionChecklistAction,
	AttentionChecklistEntry,
	AttentionChecklistField,
	AttentionChecklistSource,
} from "./attention/attention-checklist.js";
export { AttentionPolicy } from "./attention/attention-policy.js";
export { AttentionStateEquality } from "./attention/attention-state-equality.js";
export { AttentionStateRules } from "./attention/attention-state-rules.js";
export { AttentionTaskSelection } from "./attention/attention-task-selection.js";
export {
	type AttentionFacts,
	type AttentionStage,
	EvaluateAttention,
} from "./attention/evaluate-attention.js";
export type {
	AttentionApproval,
	AttentionCode,
	AttentionCondition,
	AttentionEpisode,
	AttentionMessageReference,
	AttentionObservation,
	AttentionOwner,
	AttentionPostResult,
	AttentionRecoveryItem,
	AttentionState,
	AttentionView,
} from "./attention/model.js";
export { ATTENTION_CODES } from "./attention/model.js";
export type {
	AttentionApprovalSource,
	AttentionNotification,
	AttentionRecoverySource,
	AttentionRepository,
} from "./attention/ports.js";
export {
	type AttentionResult,
	ReconcileAttention,
} from "./attention/reconcile-attention.js";
export { CommunicationDomainComposition } from "./dependency-composition.js";
export type { CommunicationIdempotencyComponents } from "./idempotency.js";
export { CommunicationIdempotency } from "./idempotency.js";
export { MailBatchFingerprint } from "./mail-batch-fingerprint.js";
export type {
	CommunicationDiagnostic,
	CommunicationDiagnosticCode,
	CommunicationIntent,
	CommunicationKind,
	DeliveryLedgerEntry,
	DeliveryReservation,
	DeliveryReservationResult,
	DeliveryStatus,
	EventOccurrenceStatus,
	EventReadiness,
	GatewayDiagnosticCode,
	GatewayDispatchResult,
	GatewayRejectionCode,
	GatewayRetryCode,
	MailCommunicationKind,
	MailMessageIntent,
	MailRecipient,
	MailRecipientRole,
	MailTemplateName,
	PlanCommunicationsInput,
	PlanCommunicationsResult,
	ReconcileCommunicationCounts,
	ReconcileCommunicationsInput,
	ReconcileCommunicationsResult,
	ReconcileMode,
} from "./model.js";
export { MAIL_TEMPLATE_NAMES } from "./model.js";
export { PlanCommunications } from "./plan-communications.js";
export type {
	CommunicationClock,
	DeliveryLedger,
	MailGateway,
} from "./ports.js";
export { PostEventPolicy } from "./post-event-policy.js";
export type { ReconcileCommunicationsDependencies } from "./reconcile-communications.js";
export { ReconcileCommunications } from "./reconcile-communications.js";
export type {
	LinkedInSocialDestination,
	SlackSocialDestination,
	SocialDestination,
} from "./social/social-destination.js";
export {
	type SocialPostChannel,
	SocialPostDraft,
	type SocialPostMilestone,
} from "./social/social-post-draft.js";
export { SocialPostTiming } from "./social/social-post-timing.js";
export { SocialRecoveryReference } from "./social/social-recovery-reference.js";
export type {
	SocialPostReceipt,
	SocialPreparedMedia,
	SocialDispatchResult,
	SocialPostInput,
	SocialPublicationGateway,
	SocialImageInput,
	SocialMediaResult,
	SocialImageGateway,
	SocialDeliveryRecovery,
	SocialDeliveryAttempt,
	SocialDeliveryRecord,
	SocialDeliveryJournal,
} from "./social/social-publication-ports.js";
