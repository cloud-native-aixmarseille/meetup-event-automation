export const EN_MESSAGES = {
	"approval.content.planned":
		"Planned publication: {time}. Recheck eligibility before posting.",
	"approval.content.slot":
		"Image {index}: {status, select, complete {stored} reserved {outcome uncertain; no automatic retry} failed {failed} other {not requested}}.",

	"approval.content.title":
		"### Review event content: {target}\n\nLanguage: {language} · Author: {origin}",
	"approval.content.request":
		"Review the exact text and images above. Select exactly one choice. Approval authorizes this content; publication and sending have separate controls. Submit replacements or iteration guidance separately.\n\n{approve}\n- [{rejectMark}] Reject this content\n- [{iterateMark}] Request another iteration",
	"approval.content.text-choice": "- [{mark}] Approve this content",
	"approval.content.image-choice":
		"- [{mark}] Approve image {index, number} as the cover",
	"approval.content.final":
		"{status, select, approved {✅ Content approved} rejected {❌ Content rejected} iteration_requested {🔄 Another iteration requested} other {Decision recorded}} by @{actor} on {decidedAt}.\n\nSelected image: {image}\n\nThis decision is final for this revision. Changed content requires a new review.",
	"approval.meetup.details":
		"### Organizer confirmation: publish Meetup event\n\n**{title}**\n\n{date} · {startTime}–{endTime} ({timeZone})\n\n{venue}, {city}\n\n[Review the Meetup draft]({url}) before approving publication.",
	"approval.meetup.request":
		"Repository writers: select one choice. After approval, automation publishes the reviewed draft. Event changes require a new approval.\n\n- [{approveMark}] Approve publishing this Meetup event\n- [{rejectMark}] Reject publishing this Meetup event",
	"approval.meetup.final":
		"{status, select, approved {✅ **Publication approved**} rejected {❌ **Publication rejected**} other {Decision recorded}} by @{actor} on {decidedAt}.\n\n{status, select, approved {Automation may publish this draft after rechecking its content. The issue checkbox records verified publication.} rejected {Automation will keep this event in draft.} other {}} Event changes require a new approval.",

	"follow-up.title": "## Post-event follow-up · {date}",
	"follow-up.instructions":
		"Update manual tasks in the issue's Post event checklist.",
	"follow-up.task":
		"{task, select, thank_host {Thank the host} thank_speakers {Thank the speakers} share_slides {Share slides on Meetup} import_attendance {Import attendance into CNCF} share_social {Share on social networks} other {Post-event task}}",
	"follow-up.stopped": "Follow-up paused.",
	"follow-up.waiting": "Thank-you emails are not ready for approval.",
	"follow-up.emails-complete": "No thank-you emails pending.",
	"approval.details.summary": "Review email details",
	"approval.details.email":
		"{kind, select, host_introduction {Introduction for the host contact} speaker_introduction {Introduction for the speaker} host_thanks {Thank-you email for the host contact} speaker_thanks {Thank-you email for the speaker} other {Email}}",
	"approval.details.purpose":
		"{kind, select, host_introduction {Thanks the host for welcoming the meetup and shares event links, slides and logistical requirements.} speaker_introduction {Shares event links, arrival and venue information, and presentation guidance.} host_thanks {Thanks the host for organizing the meetup and invites future collaboration.} speaker_thanks {Thanks the speaker, shares feedback results for their talks and invites suggestions about the meetup.} other {Sends the planned email.}}",
	"approval.details.link":
		"{kind, select, meetup {Meetup event} community {CNCF community event} slides {Meetup presentation} other {Event link}}",
	"approval.details.feedback": "Feedback results: {title}",
	"approval.details.omitted-emails":
		"{count, plural, one {# more email in this batch.} other {# more emails in this batch.}}",
	"approval.details.omitted-links":
		"{count, plural, one {# more link.} other {# more links.}}",
	"approval.final":
		"### Organizer confirmation: {kind, select, introduction {introduction emails} thanks {thank-you emails} other {action}}\n\n{date} · Up to {count, number} recipients.\n\n{status, select, approved {✅ **Approved**} rejected {❌ **Rejected**} other {Decision recorded}} by @{actor} on {decidedAt}.\n\n{status, select, approved {Approved for dispatch; completed deliveries are skipped.} rejected {This batch will not be sent.} other {}} Batch changes require a new approval.",
	"approval.request":
		"### Organizer confirmation: {kind, select, introduction {introduction emails} thanks {thank-you emails} other {action}}\n\n{date} · Up to {count, number} recipients. Completed deliveries are skipped.\n\nRepository writers: select one choice.\n\n- [{approveMark}] Approve sending this batch\n- [{rejectMark}] Reject sending this batch\n\nBatch changes require a new approval.",
} as const;
