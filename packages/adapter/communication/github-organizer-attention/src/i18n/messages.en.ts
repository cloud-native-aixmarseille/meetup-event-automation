export const messages = {
	"action.slides-approval-pending":
		"Approve sending the PDF to Meetup attendees.",
	"failure.publication.meetup.authentication-configuration":
		"Meetup login credentials are missing from the automation configuration. Check PUBLICATION_CREDENTIALS.",
	"failure.publication.meetup.authentication-captcha-required":
		"Meetup requires a CAPTCHA that automation could not complete. Publication is paused.",
	"failure.publication.meetup.authentication-captcha-rejected":
		"Meetup rejected the CAPTCHA response. Login retries are exhausted; retry synchronization later.",
	"failure.publication.meetup.authentication-captcha-unavailable":
		"The CAPTCHA solver failed before login could complete. Check the solver's availability and retry synchronization.",
	"failure.publication.meetup.authentication-session-not-reusable":
		"Meetup redirected account verification back to login after retries. The session was not retained; retry synchronization.",
	"failure.publication.meetup.authentication-login-page-unavailable":
		"The Meetup login page could not load after retries. Retry synchronization later.",
	"failure.publication.meetup.authentication-login-form-unavailable":
		"The Meetup email/password form could not be filled after retries. Check the login form selectors.",
	"failure.publication.meetup.authentication-submit-unavailable":
		"The Meetup login button could not be activated after retries. Check the login page controls.",
	"failure.publication.meetup.authentication-redirect-timeout":
		"Meetup did not complete the login redirect after retries. No credential rejection was detected; retry synchronization later.",
	"failure.publication.meetup.authentication-account-unavailable":
		"The logged-in account could not be verified after retries. Check account-page loading and selectors.",
	"failure.publication.meetup.authentication-account-mismatch":
		"The authenticated Meetup account does not match the configured account. The session was discarded.",
	"failure.publication.meetup.authentication-unexpected-page":
		"Meetup login reached an unexpected page. Authentication stopped; check the login flow before retrying.",
	"failure.publication.meetup.authentication-rate-limited":
		"Meetup returned HTTP 429 during authentication. Automatic retries stopped; wait before restarting synchronization.",
	"failure.publication.meetup.authentication-browser":
		"Chrome could not start or its authentication connection failed after retries. Check the browser runtime.",
	"failure.publication.meetup.editor":
		"Meetup event editor loading or preparation failed. Check the editor controls in the failed run.",
	"failure.publication.meetup.verification":
		"Meetup event verification failed. Check the saved event before retrying.",
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
	"attention.redirect": "[Post-event tasks and approvals]({url})",
	"attention.review": "Review details",
	"attention.unknown": "status unverified",
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
	"attention.pending":
		"Verify the Slack post before retrying: delivery is unconfirmed.",
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
	"task.content": "content",
	"task.communications": "communications",
	"task.unknown": "review the issue",
} as const;
