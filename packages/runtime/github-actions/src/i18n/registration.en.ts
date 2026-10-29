export const REGISTRATION_EN = {
	"action.publication.reconcile-registrations": "Reconcile event registrations",
	"report.registration.counts":
		"registration_reconciliation={status} source_responses={responses, number} source_participants={participants, number} duplicates={duplicates, number} invalid={invalid, number}",
	"report.registration.blocked":
		"Reconciliation blocked: supported OCGroups membership and event registration operations are unavailable. Source records passed validation, but neither remote outcome has been verified. Keep the CNCF attendee checklist task open until both outcomes are verified.",
	"report.registration.invalid":
		"Review the event's CNCF Link, response email header, and selected rows in the restricted Sheet. Correct missing or invalid identities before retrying. The CNCF attendee checklist task remains pending.",
	"report.registration.skipped":
		"Reconciliation requires an open meetup issue confirmed as held. No responses were read; the CNCF attendee checklist task remains unchanged.",
} as const;
