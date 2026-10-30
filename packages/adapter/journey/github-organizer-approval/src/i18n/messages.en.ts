export const EN_MESSAGES = {
	"approval.content.image-label": "#### Image {index, number}",
	"approval.social.after-approval": "after approval",
	"approval.social.details":
		"### Publish on {target}\n\n{destination} · {identity}\n\nScheduled for: {plannedAt}; expires: {expiresAt}.\n\nReview the post below.",
	"approval.social.request":
		"Select one choice to publish this post to the destination above. Changes require another approval.\n\n- [{approveMark}] Approve publication\n- [{rejectMark}] Reject publication",
	"approval.social.evidence":
		"Evidence: {reference}\n\nResult: {outcome, select, published {published} not_published {not published} other {unknown}}.",
	"approval.social.recovery":
		"Check the evidence above before selecting a choice.\n\n- [{approveMark}] {outcome, select, published {Confirm publication and save the post ID} not_published {Confirm no post was published and allow a retry with valid approval} other {Confirm recovery}}\n- [{rejectMark}] Keep publication blocked",
	"approval.social.final":
		"{status, select, approved {✅ Publication approved} rejected {❌ Publication rejected} other {Decision recorded}} by @{actor} on {decidedAt}.\n\nSee the delivery status for the result.",
	"approval.community.details":
		"### Publish on CNCF\n\n**{title}**\n\n{date} · {startTime}–{endTime} ({timeZone})\n\n{venue}, {city}\n\n[Review the OCGroups draft]({url}). Publishing may notify group members and speakers.",
	"approval.community.request":
		"Select one choice. Approval includes OCGroups notifications.\n\n- [{approveMark}] Approve publication\n- [{rejectMark}] Reject publication",
	"approval.community.final":
		"{status, select, approved {✅ CNCF publication approved} rejected {❌ CNCF publication rejected} other {Decision recorded}} by @{actor} on {decidedAt}.\n\nCNCF Link is added after publication is verified.",
	"approval.content.planned": "Scheduled for: {time}.",
	"approval.content.slot":
		"Image {index}: {status, select, complete {ready} reserved {result unknown; check before retrying} failed {generation failed} other {not generated}}.",

	"approval.content.title":
		"### {target, select, title {Meetup title} description {Meetup description} cover {Meetup covers} other {Text for {target}}}",
	"approval.content.request":
		"{target, select, cover {Choose one image.} other {Edit the text in this comment if needed, then select one choice.}} Publishing requires a separate approval.\n\n{approve}\n- [{rejectMark}] ❌ Reject\n- [{iterateMark}] 🔄 Generate another proposal",
	"approval.content.text-choice": "- [{mark}] ✅ Approve",
	"approval.content.image-choice": "- [{mark}] ✅ Choose image {index, number}",
	"approval.content.final":
		"{status, select, approved {✅ Approved} rejected {❌ Rejected} iteration_requested {🔄 New proposal requested} other {Decision recorded}} by @{actor} on {decidedAt}.{image, plural, =0 {} other {\n\nSelected image: #}}",
	"approval.meetup.details":
		"### Publish on Meetup\n\n**{title}**\n\n{date} · {startTime}–{endTime} ({timeZone})\n\n{venue}, {city}\n\n[Review the Meetup draft]({url}).",
	"approval.meetup.request":
		"Select one choice. Automation publishes the approved draft.\n\n- [{approveMark}] Approve publication\n- [{rejectMark}] Reject publication",
	"approval.meetup.final":
		"{status, select, approved {✅ Publication approved} rejected {❌ Publication rejected} other {Decision recorded}} by @{actor} on {decidedAt}.\n\n{status, select, approved {The issue checkbox confirms publication.} rejected {The event stays in draft.} other {}}",

	"follow-up.title": "## Post-event follow-up · {date}",
	"follow-up.instructions":
		"Update manual tasks in the issue's Post event checklist.",
	"follow-up.task":
		"{task, select, thank_host {Thank the host} thank_speakers {Thank the speakers} share_slides {Automatic slides email to Meetup attendees} import_attendance {Import attendance into CNCF} share_social {Publish an event recap on LinkedIn} other {Post-event task}}",
	"follow-up.stopped": "Follow-up paused.",
	"follow-up.waiting": "Thank-you emails are not ready yet.",
	"follow-up.emails-complete": "No thank-you emails pending.",
	"approval.details.summary": "Email details",
	"approval.details.email":
		"{kind, select, host_introduction {Host introduction} speaker_introduction {Speaker introduction} host_thanks {Host thank-you} speaker_thanks {Speaker thank-you} other {Email}}",
	"approval.details.purpose":
		"{kind, select, host_introduction {Event links, slides, and logistics.} speaker_introduction {Event links, arrival details, and talk instructions.} host_thanks {Thanks and an invitation to host again.} speaker_thanks {Thanks, talk feedback, and a request for suggestions.} other {Planned email.}}",
	"approval.details.link":
		"{kind, select, meetup {Meetup event} community {CNCF community event} slides {Meetup presentation} other {Event link}}",
	"approval.details.feedback": "Feedback results: {title}",
	"approval.details.omitted-emails":
		"{count, plural, one {# more email.} other {# more emails.}}",
	"approval.details.omitted-links":
		"{count, plural, one {# more link.} other {# more links.}}",
	"approval.final":
		"### {kind, select, introduction {Introduction emails} thanks {Thank-you emails} other {Action}}\n\n{date} · Up to {count, plural, one {# recipient} other {# recipients}}\n\n{status, select, approved {✅ Approved} rejected {❌ Rejected} other {Decision recorded}} by @{actor} on {decidedAt}.\n\n{status, select, approved {Previously sent emails will not be sent again.} rejected {These emails will not be sent.} other {}}",
	"approval.request":
		"### {kind, select, introduction {Introduction emails} thanks {Thank-you emails} other {Action}}\n\n{date} · Up to {count, plural, one {# recipient} other {# recipients}}\n\nSelect one choice. Previously sent emails are skipped. Changes require another approval.\n\n- [{approveMark}] Approve sending\n- [{rejectMark}] Reject sending",
} as const;
