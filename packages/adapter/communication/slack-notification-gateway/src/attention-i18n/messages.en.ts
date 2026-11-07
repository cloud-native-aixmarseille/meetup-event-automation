export const messages = {
	"action.slides-approval-pending":
		"Approve sending the PDF to Meetup attendees.",
	"failure.publication.meetup.authentication-configuration":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-captcha-required":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-captcha-rejected":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-captcha-unavailable":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-session-not-reusable":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-login-page-unavailable":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-login-form-unavailable":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-submit-unavailable":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-redirect-timeout":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-account-unavailable":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-account-mismatch":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-unexpected-page":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-rate-limited":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.authentication-browser":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.editor":
		"Meetup publication blocked. Review the workflow.",
	"failure.publication.meetup.verification":
		"Meetup publication blocked. Review the workflow.",
	"action.content-approval-pending":
		"Edit the proposed text if needed, then approve or request another proposal.",
	"action.social-target-approval-pending": "Publication approval: {target}.",
	"action.social-approval-pending":
		"Review the announcement and approve publication for this destination.",
	"failure.social": "Posting failed.",
	"task.social": "social posts",
	"action.community-approval-pending":
		"Approve or reject OCGroups publication.",
	"failure.communications": "Email preparation or sending failed.",
	"failure.feedback": "OpenFeedback synchronization failed.",
	"failure.assets": "Drive file preparation failed.",
	"failure.event": "Meetup issue update failed.",
	"task.event-data": "meetup details",
	"slack.title": "Meetup #{issue}",
	"slack.more":
		"+{count, plural, one {# more task} other {# more tasks}} → View all",
	"slack.run": "Review run",
	"slack.review": "Review details",
	"slack.unknown": "status unverified",
	"action.missing-date": "Set the event date.",
	"action.required-data": "Complete or correct: {task}.",
	"action.host-confirmation": "Select a host in the meetup form.",
	"action.speaker-confirmation": "Confirm the speakers (`speakers:confirmed`).",
	"action.manual-publication": "{task}.",
	"action.meetup-approval-pending": "Approve or reject Meetup publication.",
	"action.email-target-approval-pending":
		"{target, select, host_introduction {Approve or reject the host preparation email.} speaker_introduction {Approve or reject the speaker preparation emails.} host_thanks {Approve or reject the host thank-you email.} speaker_thanks {Approve or reject the speaker thank-you emails.} other {Approve or reject the emails.}}",
	"action.approval-pending": "Approve or reject the emails.",
	"action.integration-failure": "Automation failed: {task}.",
	"action.delivery-recovery": "Verify delivery before retrying.",
	"action.occurrence-decision":
		"Date passed: mark held, postponed, or cancelled.",
	"action.follow-up": "{task}.",
	"action.stage-unknown": "Unverified stage result: {task}.",

	"task.approvals": "email approval",
	"task.delivery": "delivery recovery",

	"attention.clear": "No pending tasks.",
	"task.publish-community-event":
		'Publish on the CNCF platform and fill in "CNCF Link"',
	"task.date": "event date",
	"task.title": "event title",
	"task.description": "event description",
	"task.agenda": "talk agenda",
	"task.agenda-speakers": "talk speakers",
	"task.agenda-descriptions": "talk descriptions",
	"task.host": "event host",
	"task.event-status": "event status",
	"task.publication-links": "publication links",
	"task.meetup-link": "Meetup Link",
	"task.community-link": "CNCF Link",
	"task.assets-link": "resources folder link",
	"task.feedback-link": "OpenFeedback Link",
	"task.confirmations": "speaker confirmation",
	"task.event-form": "event form",
	"task.create-asset-folder": "Prepare the asset folder",
	"task.thank-host": "Thank the host",
	"task.thank-speakers": "Thank the speakers",
	"task.share-slides": "Share slides",
	"task.import-attendance": "Import attendance",
	"task.share-social": "Post a meetup recap on LinkedIn",
	"task.event": "event validation",
	"task.assets": "assets",
	"task.feedback": "feedback",
	"task.communications": "communications",
	"task.unknown": "review the issue",
} as const;
