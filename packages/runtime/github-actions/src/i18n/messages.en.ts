export const EN_MESSAGES = {
	"diagnostic.issue-form.out-of-date": "Synchronize the issue form.",
	"diagnostic.issue-form.updated": "Issue form synchronized.",
	"report.speaker-sync.pr-title":
		"feat(referential): synchronize Conference Hall speakers",
	"report.speaker-sync.pr-body":
		"Review speaker identity mappings and preserved local CSV fields before merging.",
	"action.referential.sync-speakers": "Synchronize Conference Hall speakers",
	"report.speaker-sync.completed": "speaker_sync=completed speakers={count}",
	"report.speaker-sync.failed": "speaker_sync=blocked stage={stage}",
	"report.speaker-sync.stage.read-catalog": "read-catalog",
	"report.speaker-sync.stage.load-source": "load-source",
	"report.speaker-sync.stage.merge-speakers": "merge-speakers",
	"report.speaker-sync.stage.validate-catalog": "validate-catalog",
	"report.speaker-sync.stage.check-form": "check-form",
	"report.speaker-sync.stage.save-catalog": "save-catalog",
	"report.speaker-sync.stage.update-form": "update-form",
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

	"action.communication.reconcile-attention": "Reconcile organizer attention",
	"report.attention.updated": "attention=persisted",
	"report.attention.skipped": "attention=skipped reason=unrelated-issue",
	"report.attention.failed": "attention=synchronization-failed",

	"action.publication.reconcile-feedback": "Reconcile meetup feedback",
	"report.feedback.skipped": "feedback=skipped",
	"report.feedback.completed": "feedback=completed",
	"report.feedback.changes":
		"issue_persisted={persisted} feedback_link_updated={linkUpdated}",
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
	"action.referential.sync-issue-form": "Synchronize meetup issue form",
	"action.event.reconcile": "Reconcile meetup event",
	"action.event.list-active": "List active meetup events",
	"action.communication.reconcile": "Reconcile meetup communications",
	"action.publication.reconcile-assets": "Reconcile meetup assets",
	"report.failed": "failure={reason}",
	"report.technical-failure": "technical_failure={codes}",
	"report.summary-unavailable": "summary=unavailable",
	"report.error.unexpected": "Unexpected technical failure.",
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
