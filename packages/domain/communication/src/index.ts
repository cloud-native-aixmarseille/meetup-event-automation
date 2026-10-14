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
export type {
	CommunicationClock,
	DeliveryLedger,
	MailGateway,
	NotificationGateway,
} from "./ports.js";
export type { ReconcileCommunicationsDependencies } from "./reconcile-communications.js";
export { ReconcileCommunications } from "./reconcile-communications.js";
export { MailBatchFingerprint } from "./mail-batch-fingerprint.js";
