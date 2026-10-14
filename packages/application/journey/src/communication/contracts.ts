import type { ReconcileCommunicationsResult } from "@meetup-automation/communication";

export interface ManageMeetupCommunicationsInput {
	readonly issueNumber: number;

	readonly organizerNotificationDestination: string;
	readonly owner: string;
	readonly repo: string;
	readonly repositoryId?: string;
}

type CommunicationJourneyDiagnosticCode =
	| "communication.dispatch-disabled-by-config"
	| "communication.approval-pending"
	| "communication.approval-rejected"
	| "communication.approval-unavailable"
	| "communication.approval-notification-failed"
	| "communication.checklist-update-failed"
	| "communication.event-skipped"
	| "communication.event-concurrently-modified"
	| "communication.event-references-unresolved"
	| "communication.github-credential-missing"
	| "communication.referential-catalog-invalid";

export interface CommunicationJourneyDiagnostic {
	readonly code: CommunicationJourneyDiagnosticCode;
	readonly severity: "info" | "warning" | "error";
}

export type ManageMeetupCommunicationsResult = ReconcileCommunicationsResult &
	Readonly<{
		runtimeDiagnostics: readonly CommunicationJourneyDiagnostic[];
	}>;
