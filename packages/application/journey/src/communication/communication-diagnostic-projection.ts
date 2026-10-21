import type { CommunicationDiagnostic } from "@meetup-automation/communication";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { CommunicationJourneyDiagnostic } from "./contracts.js";

const COMMUNICATION_MESSAGES: Readonly<
	Record<CommunicationDiagnostic["code"], string>
> = {
	"duplicate-intent": "A duplicate communication intent was ignored.",
	"gateway-delivery-uncertain": "A gateway could not confirm delivery.",
	"gateway-delivery-rejected":
		"A gateway definitively rejected the delivery request.",
	"gateway-delivery-deferred":
		"A gateway deferred the request; a later retry remains safe.",
	"gateway-threw-ambiguous-error":
		"A gateway failed without a definitive delivery outcome.",
	"invalid-clock": "The communication clock is invalid.",
	"invalid-event-date": "The event date is invalid.",
	"invalid-identifier": "A stable communication identifier is invalid.",
	"invalid-time-zone": "The configured time zone is invalid.",
	"ledger-read-failed": "The delivery ledger could not be read.",
	"ledger-reservation-failed": "The delivery could not be reserved safely.",
	"ledger-status-write-failed": "The delivery status could not be recorded.",
	"missing-mail-destination": "An opted-in mail recipient has no destination.",
	"occurrence-status-unknown": "The event occurrence status must be explicit.",
	"delivery-already-recorded":
		"The delivery ledger already contains this intent.",
};

const RUNTIME_MESSAGES: Readonly<
	Record<CommunicationJourneyDiagnostic["code"], string>
> = {
	"communication.feedback-fetch-failed":
		"Feedback results could not be fetched.",
	"communication.feedback-unavailable":
		"Speaker thank-you emails require resolved feedback results for every talk.",
	"communication.slides-unavailable":
		"Email dispatch requires a valid presentation file URL and ready managed content. Resolve asset diagnostics and run reconciliation again.",
	"communication.approval-pending":
		"Email dispatch is waiting for approval on the meetup issue.",
	"communication.approval-rejected":
		"The email batch was rejected. The recorded decision is final for this batch revision.",
	"communication.approval-unavailable":
		"The organizer approval could not be verified or persisted; email dispatch is blocked.",
	"communication.approval-notification-failed":
		"The Slack approval notification or decision reaction was not confirmed. Review the request on the meetup issue.",
	"communication.dispatch-disabled-by-config":
		"Communication dispatch is disabled by repository configuration.",
	"communication.checklist-update-failed":
		"Delivery results are recorded but checklist completion could not be persisted.",
	"communication.checklist-concurrently-modified":
		"Delivery results are recorded; an organizer edit postponed checklist completion.",
	"communication.event-skipped": "The issue is not a configured meetup event.",
	"communication.event-concurrently-modified":
		"The meetup issue changed while communications were being reconciled; no delivery was attempted.",
	"communication.event-references-unresolved":
		"Event participants could not be resolved to stable identifiers.",
	"communication.referential-catalog-invalid":
		"Communications are disabled because the referential catalog is invalid.",
};

/** Canonical public machine diagnostics; channel wording belongs to presenters. */
export class CommunicationDiagnosticProjection {
	domainDiagnostic(diagnostic: CommunicationDiagnostic): PublicDiagnostic {
		return {
			code: `communication.${diagnostic.code}`,
			severity: diagnostic.severity,
			message: COMMUNICATION_MESSAGES[diagnostic.code],
		};
	}

	runtimeDiagnostic(
		diagnostic: CommunicationJourneyDiagnostic,
	): PublicDiagnostic {
		return {
			code: diagnostic.code,
			severity: diagnostic.severity,
			message: RUNTIME_MESSAGES[diagnostic.code],
		};
	}
}
