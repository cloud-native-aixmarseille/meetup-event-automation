export const messages = {
	"attention.diagnostics": "Detailed diagnostics",
	"task.approvals": "email approvals",
	"task.delivery": "delivery recovery",
	"task.public-slack-local": "post the local community Slack announcement",
	"task.public-slack-community": "post the community Slack announcement",
	"task.public-social": "publish on social networks",

	"attention.title": "Organizer attention",
	"attention.date": "Event date: {date}",
	"attention.full": "Review the full issue status",
	"attention.more": "Additional items are listed on the issue.",
	"attention.clear": "No outstanding organizer tasks.",
	"attention.stopped":
		"Task reminders stopped: this event is closed, cancelled, or postponed. Unverified deliveries still require recovery.",
	"attention.pending":
		"Slack acknowledgement is uncertain. Verify the reserved post before explicitly recovering it; automatic reposting is blocked.",
	"attention.retry":
		"Slack did not accept the post. A retry is scheduled after backoff.",
	"attention.unknown":
		"Evaluation unavailable; previous conditions remain unresolved.",
	"attention.resolved": "Resolved conditions: {count, number}.",
	"attention.missing-date": "Set a valid event date in the issue.",
	"attention.required-data":
		"Complete the required event information; review the event diagnostic comment.",
	"attention.host-confirmation":
		"Confirm the host and apply the host confirmation label.",
	"attention.speaker-confirmation":
		"Confirm the speakers and apply the speaker confirmation label.",
	"attention.manual-publication": "Finish the manual publication task: {task}.",
	"attention.approval-pending":
		"Approve or reject the pending email batch in its original request.",
	"attention.integration-failure":
		"Review the failed or blocked stage ({task}) in the workflow run; correct its configuration or inputs before retrying.",
	"attention.delivery-recovery":
		"Verify the external delivery and its ledger record before recovery. Do not resend an uncertain delivery.",
	"attention.occurrence-decision":
		"The scheduled date has passed. Mark the event held, postponed, or cancelled.",
	"attention.follow-up":
		"Complete the follow-up task: {task}. Accepted email dispatch does not prove inbox delivery.",
	"attention.stage-unknown":
		"The {task} stage did not complete. Review the run; its previous conditions remain unresolved.",
	"task.publish-meetup-event": "publish on Meetup",
	"task.publish-community-event": "publish on the CNCF platform",
	"task.create-asset-folder": "prepare the asset folder",
	"task.thank-host": "send host thanks",
	"task.thank-speakers": "send speaker thanks",
	"task.share-slides": "share slides",
	"task.import-attendance": "import attendance",
	"task.share-social": "share on social networks",
	"task.event": "event validation",
	"task.assets": "assets",
	"task.feedback": "feedback",
	"task.communications": "communications",
	"task.unknown": "review the issue",
} as const;
