export const EN_MESSAGES = {
	"ledger.title": "### Delivery status",
	"ledger.empty": "No deliveries recorded.",
	"ledger.row": "- {kind}: {status} ({count, number})",
	"ledger.kind":
		"{kind, select, host_introduction {Host introduction} speaker_introduction {Speaker introduction} host_thanks {Host thanks} speaker_thanks {Speaker thanks} attendee_slides {Slides to Meetup attendees} readiness_reminder {Organizer Slack reminder} other {Message}}",
	"ledger.status":
		"{status, select, accepted {Accepted} pending {In progress or awaiting verification} rejected {Rejected} uncertain {Check delivery} other {Unknown}}",
	"ledger.explanation":
		"Accepted by the mail service; inbox delivery is unverified.",
	"ledger.attention": "Check delivery with the provider before retrying.",
} as const;
