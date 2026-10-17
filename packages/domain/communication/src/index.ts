export type { CommunicationIdempotencyComponents } from "./idempotency.js";
export { CommunicationIdempotency } from "./idempotency.js";
export type {
	CommunicationDiagnostic,
	CommunicationDiagnosticCode,
	CommunicationDispatchCapabilities,
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
	NotificationMessageIntent,
	NotificationRecipient,
	PlanCommunicationsInput,
	PlanCommunicationsResult,
	ReconcileCommunicationCounts,
	ReconcileCommunicationsInput,
	ReconcileCommunicationsResult,
	ReconcileMode,
} from "./model.js";
export { MAIL_TEMPLATE_NAMES } from "./model.js";
export { PlanCommunications } from "./plan-communications.js";
export { PostEventPolicy } from "./post-event-policy.js";
export type {
	CommunicationClock,
	DeliveryLedger,
	MailGateway,
	NotificationGateway,
} from "./ports.js";
export type { ReconcileCommunicationsDependencies } from "./reconcile-communications.js";
export { ReconcileCommunications } from "./reconcile-communications.js";
export { MailBatchFingerprint } from "./mail-batch-fingerprint.js";

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
export { AttentionPolicy } from "./attention/attention-policy.js";
export {
	ReconcileAttention,
	type AttentionResult,
} from "./attention/reconcile-attention.js";
export {
	EvaluateAttention,
	type AttentionFacts,
	type AttentionStage,
} from "./attention/evaluate-attention.js";
export type { AttentionContent } from "./attention/ports.js";
