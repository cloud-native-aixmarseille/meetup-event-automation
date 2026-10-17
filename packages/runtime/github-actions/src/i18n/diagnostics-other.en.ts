export const DIAGNOSTICS_OTHER_EN = {
	"diagnostic.publication.assets.file.drift":
		"An event template copy is missing or its name or template metadata has changed",
	"diagnostic.publication.assets.content.contract":
		"Check the versioned content contract, supported MIME type, tokens, image slots and fit policy.",
	"diagnostic.publication.assets.content.missing":
		"Complete the required public text or link, then reconcile again. The existing copy is reused.",
	"diagnostic.publication.assets.content.location":
		"Place Slides tokens in whole text shapes and Docs tokens in body paragraphs. Check tab and object IDs, alt text and supported structures.",
	"diagnostic.publication.assets.content.conflict":
		"A managed location changed or its anchor is missing. Preserve the edit; use revision-bound restore or remove recovery in the asset content configuration.",
	"diagnostic.publication.assets.content.recovery":
		"Inspect the file and binding sidecar. Restore valid state or use explicit enrollment or binding recovery; do not delete the file or reset email records.",
	"diagnostic.publication.assets.content.revision":
		"The document changed during rendering. Reconcile again after the current edit is complete.",
	"diagnostic.publication.assets.content.image":
		"Check the public HTTPS portrait and fallback: PNG, JPEG or GIF, under 50 MB and at most 25 megapixels. Signed or private URLs are unsupported.",
	"diagnostic.publication.assets.content.fallback":
		"An optional portrait uses its validated generic fallback. The file remains ready; check the speaker assignment and public picture URL.",

	"diagnostic.publication.feedback.agenda":
		"Complete talk subjects and resolve speaker references in the issue before synchronizing the feedback agenda. Existing feedback is preserved.",
	"diagnostic.publication.feedback.unrelated": "This issue is not a meetup",
	"diagnostic.publication.feedback.inactive":
		"Feedback automation is inactive for this event",
	"diagnostic.publication.feedback.prerequisites":
		"Resolve the event title, date and feedback link before updating feedback",
	"diagnostic.publication.feedback.current-event":
		"An active meetup takes place today; keep its shared feedback link until the event day ends",
	"diagnostic.publication.feedback.ambiguous-date":
		"Several active meetups share this date; update the shared feedback link manually",
	"diagnostic.publication.assets.prerequisites":
		"Resolve the event host and date before reconciling assets",
	"diagnostic.publication.community-url.invalid":
		"Community event URL must use an approved CNCF/OCGroups prefix and identifier",
	"diagnostic.publication.meetup.missing":
		"The Meetup publication link is required.",
	"diagnostic.publication.community.missing":
		"The CNCF / OCGroups publication link is required.",
	"diagnostic.publication.assets.missing":
		"The event asset folder link is required.",
	"diagnostic.publication.meetup-url.invalid":
		"Use this group's Meetup event URL, ending with the numeric event ID.",
	"diagnostic.publication.asset-url.invalid": "Use a Google Drive folder URL.",
	"diagnostic.issue-form.out-of-date": "Issue form requires synchronization.",
	"diagnostic.issue-form.updated": "Issue form was synchronized.",
	"diagnostic.action.execution.failed":
		"Meetup automation failed; inspect debug logs using a trusted runner",
} as const;
