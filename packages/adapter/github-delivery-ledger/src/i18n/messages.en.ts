export const EN_MESSAGES = {
	"ledger.title": "### Communication status",
	"ledger.empty": "No deliveries recorded.",
	"ledger.row": "- {kind}: {status} ({count, number})",
	"ledger.kind":
		"{kind, select, host_introduction {Host introduction email} speaker_introduction {Speaker introduction email} host_thanks {Host thank-you email} speaker_thanks {Speaker thank-you email} readiness_reminder {Organizer Slack reminder} other {Message}}",
	"ledger.status":
		"{status, select, accepted {Request accepted} pending {Delivery in progress or awaiting verification} rejected {Request rejected} uncertain {Delivery needs verification} other {Unknown status}}",
	"ledger.explanation":
		"Accepted by the mail service; inbox delivery is unverified.",
	"ledger.attention":
		"Check the provider before retrying unverified or rejected deliveries.",
} as const;
