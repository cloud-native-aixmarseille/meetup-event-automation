export const EN_MESSAGES = {
	"approval.details.summary": "Review email details",
	"approval.details.email":
		"{kind, select, host_introduction {Introduction for the host contact} speaker_introduction {Introduction for the speaker} host_thanks {Thank-you email for the host contact} speaker_thanks {Thank-you email for the speaker} other {Email}}",
	"approval.details.purpose":
		"{kind, select, host_introduction {Thanks the host for welcoming the meetup and shares event links, slides and logistical requirements.} speaker_introduction {Shares event links, arrival and venue information, and presentation guidance.} host_thanks {Thanks the host for organizing the meetup and invites future collaboration.} speaker_thanks {Thanks the speaker, shares feedback results for their talks and invites suggestions about the meetup.} other {Sends the planned email.}}",
	"approval.details.link":
		"{kind, select, meetup {Meetup event} community {CNCF community event} slides {Meetup presentation} other {Event link}}",
	"approval.details.feedback": "Feedback results: {title}",
	"approval.details.omitted-emails":
		"{count, plural, one {# additional email is included in this batch but omitted from this summary.} other {# additional emails are included in this batch but omitted from this summary.}}",
	"approval.details.omitted-links":
		"{count, plural, one {# additional link is included in this email but omitted from this summary.} other {# additional links are included in this email but omitted from this summary.}}",
	"approval.final":
		"### Organizer confirmation: {kind, select, introduction {introduction emails} thanks {thank-you emails} other {action}}\n\nEvent date: {date}. This batch covers up to {count, number} recipients; completed deliveries are skipped.\n\n{status, select, approved {✅ **Approved**} rejected {❌ **Rejected**} other {Decision recorded}} by @{actor} on {decidedAt}.\n\nThis decision is final for this batch revision. {status, select, approved {Approved emails can be sent when delivery checks pass. Email completion is tracked in the issue checklist.} rejected {This batch will not be sent.} other {}} Changed event details or recipients require a new confirmation.",
	"approval.request":
		"### Organizer confirmation: {kind, select, introduction {introduction emails} thanks {thank-you emails} other {action}}\n\nEvent date: {date}. This batch covers up to {count, number} recipients; completed deliveries are skipped.\n\nOrganizers with repository write access: check one choice below. Leave both unchecked to wait.\n\n- [{approveMark}] Approve sending this batch\n- [{rejectMark}] Reject sending this batch\n\nApproval applies to this batch revision. Changed event details or recipients require a new confirmation. The email checkboxes in the issue are checked after accepted dispatch.",
	"approval.slack":
		"Organizer confirmation needed: {kind, select, introduction {introduction emails} thanks {thank-you emails} other {action}} for {date}, up to {count, number} recipients. Open the request and check Approve or Reject: {url}",
} as const;
