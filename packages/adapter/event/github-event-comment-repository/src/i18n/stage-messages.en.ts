export const STAGE_MESSAGES_EN = {
	"comment.social.target": "Post ({destination}, {purpose})",
	"comment.guidance.social.pending":
		"Review the announcement and approve publication for this destination.",
	"comment.guidance.social.blocked":
		"Check the publication review, current event details and destination access before retrying.",
	"comment.guidance.social.uncertain":
		"Verify the remote post and record recovery before attempting publication again.",
	"comment.guidance.social.expired":
		"The approved publication window has expired. Review the event schedule and plan a new publication if needed.",
	"comment.guidance.social.evaluation-failed":
		"Could not check publication. Check source access and delivery records before retrying.",
	"comment.guidance.communication.concurrent-checklist":
		"The issue changed after dispatch. Rerun to update completed email tasks.",
	"comment.guidance.feedback.conflict":
		"Resolve duplicate or ambiguous talks and speakers in OpenFeedback.",
	"comment.guidance.feedback.results":
		"Synchronize every talk in OpenFeedback before sending speaker thanks.",
	"comment.guidance.feedback.access": "Check OpenFeedback access, then retry.",
	"comment.guidance.assets.slides":
		"Complete the presentation and its public link before sending emails.",
	"comment.guidance.communication.approval": "Approve or reject the emails.",
	"comment.guidance.communication.rejected":
		"Emails rejected. Change their content to request a new approval.",
	"comment.guidance.communication.approval-unavailable":
		"Approval could not be verified. Check the approval request, then retry.",
	"comment.guidance.communication.approval-notification":
		"Slack notification failed. Review the email approval comment in this issue.",
	"comment.guidance.communication.delivery-uncertain":
		"Verify delivery before retrying.",
	"comment.guidance.communication.delivery-rejected":
		"Delivery rejected. Check the mail gateway before retrying.",
	"comment.guidance.communication.delivery-deferred":
		"Delivery deferred; the next run will retry.",
	"comment.guidance.communication.configuration":
		"Ask a maintainer to check the communication workflow configuration.",
	"comment.guidance.communication.ledger":
		"Check the delivery ledger before retrying.",
	"comment.guidance.communication.destination":
		"Add an email address for each recipient.",
	"comment.guidance.communication.content":
		"Complete the notification content before retrying.",
	"comment.guidance.communication.checklist":
		"Sync again to mark completed email tasks.",
	"comment.guidance.communication.concurrent":
		"The issue changed during processing. Retry after editing.",
	"comment.guidance.communication.references":
		"Select known hosts and speakers before sending emails.",
	"comment.guidance.communication.catalog":
		"Ask a maintainer to correct the host or speaker catalog.",
	"comment.guidance.feedback.agenda":
		"Complete talk subjects and speakers before synchronizing OpenFeedback.",
	"comment.guidance.feedback.prerequisites":
		"Complete the title, date and OpenFeedback link.",
	"comment.guidance.feedback-link.prerequisites":
		"Check the active meetup selected for the shared link and complete its OpenFeedback URL.",
	"comment.guidance.feedback-link.ambiguous-date":
		"Several active meetups share the selected date. Select the shared feedback target manually.",
	"comment.guidance.assets.prerequisites":
		"Select the host and date before preparing Drive files.",
	"comment.guidance.assets.drift":
		"Restore the missing Drive file or its expected template metadata.",
	"comment.guidance.assets.template":
		"Fix the template tokens, image slots or supported document structure.",
	"comment.guidance.assets.missing":
		"Complete the required text and links for the presentation.",
	"comment.guidance.assets.recovery":
		"Review manual edits and restore the managed content bindings before retrying.",
	"comment.guidance.assets.revision":
		"The document changed. Retry after editing.",
	"comment.guidance.assets.image":
		"Use a public HTTPS PNG, JPEG or GIF image under 50 MB and 25 megapixels.",
	"comment.guidance.assets.fallback":
		"A generic image is in use. Check the speaker photo or host logo.",
	"comment.guidance.pdf.source":
		"Use a managed Google Slides presentation as the PDF source.",
	"comment.guidance.pdf.source-pending":
		"Resolve the presentation content before exporting its PDF.",
	"comment.guidance.pdf.revision":
		"The presentation changed during export. Retry after editing.",
	"comment.guidance.pdf.recovery":
		"Check the shared public folder and managed PDF, and inspect export state in the event folder. Restore verified state before retrying.",
	"comment.guidance.pdf.limit":
		"Reduce the presentation size so its exported PDF fits within the 50 MB limit.",
	"comment.guidance.pdf.invalid":
		"PDF verification failed. Ask a maintainer to inspect the export before retrying.",
	"comment.guidance.pdf.sharing":
		"Allow the service account to share the managed PDF. Verify viewer access for anyone with the link, without search discovery. Keep the folder restricted and retry after correcting file access.",
} as const;
