import type { ReconcileCommunicationsResult } from "@meetup-automation/communication";

export interface ManageMeetupCommunicationsInput {
	readonly issueNumber: number;

	readonly owner: string;
	readonly repo: string;
	readonly repositoryId?: string;
	readonly slidesUrl?: string;
	readonly slidesReady?: boolean;
}

type CommunicationJourneyDiagnosticCode =
	| "communication.content-review"
	| "communication.dispatch-disabled-by-config"
	| "communication.approval-pending"
	| "communication.approval-rejected"
	| "communication.approval-unavailable"
	| "communication.approval-notification-failed"
	| "communication.slides-unavailable"
	| "communication.feedback-unavailable"
	| "communication.feedback-fetch-failed"
	| "communication.checklist-update-failed"
	| "communication.checklist-concurrently-modified"
	| "communication.event-skipped"
	| "communication.event-concurrently-modified"
	| "communication.event-references-unresolved"
	| "communication.referential-catalog-invalid";

export interface CommunicationJourneyDiagnostic {
	readonly code: CommunicationJourneyDiagnosticCode;
	readonly severity: "info" | "warning" | "error";
}

export type ManageMeetupCommunicationsResult = ReconcileCommunicationsResult &
	Readonly<{
		runtimeDiagnostics: readonly CommunicationJourneyDiagnostic[];
	}>;
