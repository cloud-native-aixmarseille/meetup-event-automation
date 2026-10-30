export const EN_MESSAGES = {
	"diagnostic.publication.content.invalid":
		"Correct the text in the comment: title up to 80 characters on one line, description up to 12000, social post up to 2800 with its registration link. Do not edit the comment controls.",
	"action.communication.recover-social": "Recover a social post",
	"report.social.recovery": "social_recovery={status}",
	"action.communication.reconcile-social": "Update social posts",
	"report.social.empty": "social_publications=0",
	"report.social.result": "social_target={target} status={status}",
	"diagnostic.publication.meetup.slides-source":
		"Fix the issue errors before sending slides to Meetup attendees.",
	"diagnostic.publication.meetup.slides-link":
		"Provide the published Meetup event link before sending slides.",
	"diagnostic.publication.meetup.slides-pdf-pending":
		"Run document and PDF reconciliation before sending slides to Meetup attendees.",
	"diagnostic.publication.meetup.slides-delivery-recovery":
		"Check the Meetup attendee message before retrying; delivery is unconfirmed.",
	"diagnostic.publication.meetup.slides-form-unavailable":
		"The Meetup attendee message form could not be verified. Check organizer access and the browser flow.",
	"diagnostic.publication.meetup.slides-source-changed":
		"The event changed before sending slides. Run publication reconciliation again.",
	"action.publication.prepare-runtime": "Prepare event publication runtime",
	"report.publication.draft":
		"publication_provider={provider} event=draft approval=required",
	"report.publication.updated":
		"publication_provider={provider} event=synchronized",
	"report.publication.skipped": "publication_provider={provider} event=skipped",
	"report.publication.blocked": "publication_provider={provider} event=blocked",
	"report.publication.review":
		"publication_provider={provider} review_url={url}",

	"diagnostic.publication.community.content-review":
		"Review the title, description, and cover in their proposal comments.",
	"diagnostic.publication.community.approval-pending":
		"Approve or reject publication in the comment. The event stays in draft until approved.",
	"diagnostic.publication.community.approval-rejected":
		"Publication rejected. The event stays in draft.",
	"diagnostic.publication.community.approval-unavailable":
		"Approval could not be verified. Check the comment and GitHub App permissions.",
	"diagnostic.publication.community.approval-notification-failed":
		"The approval notification failed. Review the comment in the issue.",
	"diagnostic.publication.community.source":
		"Source data could not be read. Fix the reported errors before syncing.",
	"diagnostic.publication.community.unavailable":
		"Browser login or startup failed. Check runtime installation, connectivity, and the login page selectors.",

	"diagnostic.publication.community.inactive":
		"OCGroups publication is inactive for this issue.",
	"diagnostic.publication.community.prerequisites":
		"Complete the future date, title, description, confirmed speakers, agenda, and public venue. Fix any malformed Communication checkboxes.",
	"diagnostic.publication.community.link":
		"Set a valid event URL belonging to the configured OCGroups group.",
	"diagnostic.publication.community.conflict":
		"The issue link and recorded OCGroups event differ. Restore the recorded event link before running again.",
	"diagnostic.publication.community.uncertain":
		"Publication outcome is uncertain. Check the OCGroups dashboard and recover the verified event UUID in the community journal before retrying. Keep drafts out of CNCF Link. Clear a reservation only after confirming no event was created.",
	"diagnostic.publication.community.authentication":
		"Organizer login could not be verified. Check the account, credentials, and group permissions; complete any unsupported challenge interactively.",
	"diagnostic.publication.community.editor":
		"The OCGroups editor could not be prepared. Check organizer permissions, the configured venue, and browser selectors.",
	"diagnostic.publication.community.verification":
		"OCGroups did not return the expected saved event fields. Its identity is recorded; inspect the event and rerun to update it.",

	"action.event.generate-copy": "Generate event copy",
	"action.assets.generate-cover": "Generate cover artwork",
	"action.communication.generate-slack-post": "Generate Slack post",
	"action.communication.generate-linkedin-post": "Generate LinkedIn post",
	"action.organizer.review-drafts": "Review drafts",

	"diagnostic.publication.content.prerequisites":
		"Complete the date, venue, and agenda before generating content.",
	"diagnostic.publication.content.pending":
		"Edit the proposed text if needed, then approve it in the comment.",
	"diagnostic.publication.content.rejected":
		"Content rejected. Submit a replacement for review.",
	"diagnostic.publication.content.iteration-requested":
		"A new proposal was requested. Run generation again.",
	"diagnostic.publication.content.recovery":
		"Generation was interrupted. Check the saved result before retrying.",
	"diagnostic.publication.content.stale":
		"The event changed. Generate and review a new proposal.",
	"diagnostic.publication.content.title-review":
		"Edit and approve the title in its proposal comment.",
	"diagnostic.publication.content.description-review":
		"Edit and approve the description in its proposal comment.",
	"diagnostic.publication.meetup.content-review":
		"Review the title, description, and cover in their proposal comments.",
	"diagnostic.communication.content-review":
		"Review the title, description, and cover in their proposal comments.",

	"report.content.generated": "Content generation checked.",
	"report.content.reviewed": "Content approvals updated.",
	"report.content.no-work": "No content to review.",

	"action.assets.reconcile-slides-pdf": "Reconcile slides PDF",
	"action.feedback.reconcile-short-link": "Reconcile shared feedback link",
	"action.organizer.reconcile-checklist": "Reconcile organizer checklist",
	"report.checklist.updated": "checklist=persisted",
	"report.checklist.retained": "checklist=retained",
	"report.feedback.link": "link_updated={updated}",

	"diagnostic.publication.meetup.approval-pending":
		"Approve or reject publication in the comment. The event stays in draft until approved.",
	"diagnostic.publication.meetup.approval-rejected":
		"Publication rejected. The event stays in draft.",
	"diagnostic.publication.meetup.approval-unavailable":
		"Approval could not be verified. Check the comment and GitHub App permissions.",
	"diagnostic.publication.meetup.approval-notification-failed":
		"The approval notification failed. Review the comment in the issue.",

	"diagnostic.publication.meetup.source":
		"Source data could not be read. Fix the reported errors before syncing.",
	"diagnostic.publication.meetup.unavailable":
		"Browser login or startup failed. Check runtime installation, connectivity, solver configuration, and the login page selectors.",
	"action.publication.reconcile-event": "Update event publication",

	"diagnostic.publication.meetup.inactive":
		"Meetup publication is inactive for this issue.",
	"diagnostic.publication.meetup.prerequisites":
		"Complete the future date, title, description, confirmed speakers, agenda, and public venue. Fix any malformed Communication checkboxes.",
	"diagnostic.publication.meetup.link":
		"Set a valid event URL belonging to the configured Meetup group.",
	"diagnostic.publication.meetup.conflict":
		"The issue link and recorded Meetup event differ. Restore the recorded event link before running again.",
	"diagnostic.publication.meetup.uncertain":
		"Synchronization was interrupted. Check the event and cover photo library before retrying. Restore the verified event URL in Meetup Link and recover any pending or detached cover photo in the trusted journal. Leave Meetup event published unchecked until publication is confirmed. Preserve event and photo identities; clear uncertain state only after checking what Meetup accepted.",
	"diagnostic.publication.meetup.authentication":
		"Organizer login could not be verified. Check the account, credentials, and AI configuration; complete any unsupported challenge interactively.",
	"diagnostic.publication.meetup.editor":
		"The Meetup editor could not be prepared. Check organizer permissions, the configured venue, and browser selectors.",
	"diagnostic.publication.meetup.verification":
		"Meetup did not return the expected saved event fields. Its identity is recorded; inspect the event and rerun to update it.",
	"diagnostic.issue-form.out-of-date": "Synchronize the issue form.",
	"diagnostic.issue-form.updated": "Issue form synchronized.",
	"report.speaker-sync.pr-title":
		"feat(referential): synchronize Conference Hall speakers",
	"report.speaker-sync.pr-body":
		"Review speaker identity mappings and preserved local CSV fields before merging.",
	"action.referential.reconcile-speakers": "Reconcile speakers",
	"report.speaker-sync.completed": "speaker_sync=completed speakers={count}",
	"report.speaker-sync.failed": "speaker_sync=blocked stage={stage}",
	"report.speaker-sync.stage.read-catalog": "read-catalog",
	"report.speaker-sync.stage.load-source": "load-source",
	"report.speaker-sync.stage.merge-speakers": "merge-speakers",
	"report.speaker-sync.stage.validate-catalog": "validate-catalog",
	"report.speaker-sync.stage.save-catalog": "save-catalog",
	"report.speaker-sync.stage.unknown": "unknown",
	"diagnostic.speaker-sync.configuration": "Set the CFP slug and Web API key.",
	"diagnostic.speaker-sync.http":
		"Conference Hall returned an HTTP error; retry when the service is available.",
	"diagnostic.speaker-sync.authentication":
		"Check the API key in the CFP's Settings > Web API.",
	"diagnostic.speaker-sync.event-not-found":
		"Check the CFP slug in CONFERENCE_HALL_EVENT.",
	"diagnostic.speaker-sync.network":
		"Check runner network access to conference-hall.io.",
	"diagnostic.speaker-sync.timeout":
		"Conference Hall exceeded the 15-second timeout; retry.",
	"diagnostic.speaker-sync.json": "The CFP Web API returned invalid JSON.",
	"diagnostic.speaker-sync.schema":
		"Correct the indicated required field in the CFP Web API export.",
	"diagnostic.speaker-sync.response-size":
		"The CFP Web API response must contain 1 byte to 5 MiB.",
	"diagnostic.speaker-sync.unavailable":
		"Check the CFP slug, API key and runner network access.",
	"diagnostic.speaker-sync.history-unavailable":
		"Speaker ID history is unavailable. Fetch the complete repository history (fetch-depth: 0) and verify Git can read it before retrying.",
	"diagnostic.speaker-sync.invalid":
		"Check the speaker CSV, allocation state and issue form.",
	"diagnostic.speaker-sync.mapping-required":
		"Link the existing speaker using source_provider, source_event and source_speaker_id in referentials/speakers.csv; preserve speaker_id.",
	"diagnostic.speaker-sync.conflict":
		"Resolve duplicate source mappings or concurrent catalog edits.",
	"diagnostic.speaker-sync.rate-limited":
		"Conference Hall rate limit reached; retry after the API cooldown.",
	"diagnostic.speaker-sync.unexpected":
		"Unexpected technical failure during speaker synchronization.",
	"report.speaker-sync.private":
		"speaker_sync=blocked reason=private-repository-required",

	"action.organizer.reconcile-attention": "Update organizer tasks",
	"report.attention.updated": "attention=persisted",
	"report.attention.skipped": "attention=skipped reason=unrelated-issue",
	"report.attention.failed": "attention=synchronization-failed",

	"action.feedback.reconcile-event": "Update meetup feedback",
	"report.feedback.skipped": "feedback=skipped",
	"report.feedback.completed": "feedback=completed",
	"report.feedback.changes": "issue_persisted={persisted}",
	"error.EventNotFoundError": "The event could not be found.",
	"error.EventConcurrentModificationError":
		"The event changed during reconciliation.",
	"error.GoogleDriveAssetRepositoryError":
		"Google Drive asset reconciliation failed.",
	"error.GitHubEventRepositoryConfigurationError":
		"The event repository configuration is invalid.",
	"error.GitHubEventRepositoryScopeError":
		"The event is outside the configured repository scope.",
	"error.GitHubEventRepositoryResponseError":
		"GitHub returned an invalid event response.",
	"error.GitHubEventCommentRepositoryConfigurationError":
		"The comment repository configuration is invalid.",
	"error.GitHubEventCommentRepositoryScopeError":
		"The comment is outside the configured repository scope.",
	"error.GitHubEventCommentRepositoryResponseError":
		"GitHub returned an invalid comment response.",
	"action.referential.validate": "Validate meetup referentials",
	"action.issue-form.reconcile": "Reconcile meetup issue form",
	"action.event.reconcile": "Reconcile meetup event",
	"action.event.list-active": "List active meetup events",
	"action.communication.reconcile-email": "Send meetup emails",
	"action.assets.reconcile-documents": "Update meetup files",
	"report.failed": "failure={reason}",
	"report.technical-failure": "technical_failure={codes}",
	"report.summary-unavailable": "summary=unavailable",
	"report.error.unexpected": "Unexpected technical failure.",
	"error.RuntimeInputError": "Invalid action input.",
	"report.error.details": "{summary} {details}",
	"report.referential.valid": "referentials=valid",
	"report.referential.invalid": "referentials=invalid",
	"report.referential.counts":
		"hosts={hosts, number} speakers={speakers, number}",
	"report.issue-form.blocked": "issue_form=blocked reason=invalid-referentials",
	"report.issue-form.stale": "issue_form=stale",
	"report.issue-form.updated": "issue_form=updated",
	"report.issue-form.current": "issue_form=current",
	"report.issue-form.files": "files={files}",
	"report.event.context": "issue={issue} mode={mode}",
	"report.event.skipped": "event=skipped reason=unrelated-issue",
	"report.event.state": "state={state} ready={ready}",
	"report.event.persisted": "issue_persisted={persisted}",
	"report.events.count": "active_events={count, number}",
	"report.events.issues": "issues={issues}",
	"report.events.empty": "active_events=0",
	"report.assets.skipped": "assets=skipped",
	"report.assets.pdf": "pdf={status}; updated={updated}",
	"report.assets.completed": "assets=completed",
	"report.assets.counts":
		"issue_persisted={persisted} asset_files={count, number}",
	"report.communication.mode": "communication_mode={mode}",
	"report.communication.planned":
		"planned={planned, number} due={due, number} dispatched={dispatched, number}",
	"report.communication.accepted":
		"accepted={accepted, number} recorded={recorded, number} deferred={deferred, number}",
	"report.communication.uncertain":
		"uncertain={uncertain, number} rejected={rejected, number}",
} as const;
