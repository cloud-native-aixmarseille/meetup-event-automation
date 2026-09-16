export type {
	CommunicationApprovalConfirmations,
	CommunicationApprovalFacts,
	CommunicationApprovalPublicationUrls,
	CommunicationApprovalSnapshot,
} from "./approval-contracts.js";
export { COMMUNICATION_APPROVAL_SCHEMA_VERSION } from "./approval-contracts.js";
export { CommunicationApproval } from "./communication-approval.js";
export { CommunicationApprovalSnapshotError } from "./communication-approval-snapshot-error.js";
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
	CommunicationApprovalRepository,
	CommunicationApprovalSaveResult,
	CommunicationClock,
	DeliveryLedger,
	MailGateway,
	NotificationGateway,
} from "./ports.js";
export type { ReconcileCommunicationsDependencies } from "./reconcile-communications.js";
export { ReconcileCommunications } from "./reconcile-communications.js";
