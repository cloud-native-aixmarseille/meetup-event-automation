export const EN_MESSAGES = {
	"report.speaker-sync.pr-title":
		"feat(referential): synchronize Conference Hall speakers",
	"report.speaker-sync.pr-body":
		"Review identity mappings, the CSV snapshot and preserved local fields. New mappings become available after merge. Existing linked profiles refresh directly from Conference Hall during event runs. The linked workflow run identifies this snapshot; automatic merge is disabled.",
	"action.referential.sync-speakers": "Synchronize Conference Hall speakers",
	"report.speaker-sync.completed":
		"Speaker catalog and form prepared: {count} speakers. Review the private pull request before merging.",
	"report.speaker-sync.failed":
		"Speaker synchronization failed during {stage}. No review branch was published. Correct the diagnostics below before retrying.",
	"report.speaker-sync.stage.read-catalog": "reading the local speaker catalog",
	"report.speaker-sync.stage.load-source": "loading the Conference Hall export",
	"report.speaker-sync.stage.merge-speakers": "merging speaker identities",
	"report.speaker-sync.stage.validate-catalog":
		"validating the candidate catalog",
	"report.speaker-sync.stage.check-form": "checking the issue form",
	"report.speaker-sync.stage.save-catalog": "saving the speaker catalog",
	"report.speaker-sync.stage.update-form": "updating the issue form",
	"report.speaker-sync.stage.unknown": "speaker synchronization",
	"diagnostic.speaker-sync.configuration":
		"Conference Hall configuration is invalid. Set conference-hall-event to the CFP slug and provide a non-empty conference-hall-api-key.",
	"diagnostic.speaker-sync.http":
		"Conference Hall returned an unsuccessful HTTP status. Check service availability and the CFP Web API settings before retrying.",
	"diagnostic.speaker-sync.authentication":
		"Conference Hall rejected the API key. Verify CONFERENCE_HALL_API_KEY matches the key under this CFP's Settings > Web API and is forwarded as conference-hall-api-key.",
	"diagnostic.speaker-sync.event-not-found":
		"Conference Hall could not find the CFP. Verify CONFERENCE_HALL_EVENT is the CFP slug and is forwarded as conference-hall-event.",
	"diagnostic.speaker-sync.network":
		"The Conference Hall request or response transfer failed. Check network access to conference-hall.io from the runner before retrying.",
	"diagnostic.speaker-sync.timeout":
		"The Conference Hall request exceeded its 15-second timeout. Check service availability and retry.",
	"diagnostic.speaker-sync.json":
		"Conference Hall returned invalid JSON. Check the event Web API response; do not log or upload its private contents.",
	"diagnostic.speaker-sync.schema":
		"The Conference Hall export contains a missing or invalid required field at the indicated position. Check that field in the CFP Web API response; do not log private values.",
	"diagnostic.speaker-sync.response-size":
		"The Conference Hall response is empty or exceeds the 5 MiB limit. Check the event Web API export size.",
	"diagnostic.speaker-sync.unavailable":
		"Conference Hall could not be read. Verify the CFP slug, API key and runner network access before retrying.",
	"diagnostic.speaker-sync.invalid":
		"The speaker synchronization input is invalid. Validate the CSV, allocation state and issue form, then check the Conference Hall export.",
	"diagnostic.speaker-sync.mapping-required":
		"An existing CSV speaker may match a Conference Hall profile but has no source mapping. Review referentials/speakers.csv and add source_provider, source_event and source_speaker_id to the existing row. Preserve speaker_id; identities are not merged automatically.",
	"diagnostic.speaker-sync.conflict":
		"Speaker mappings, ID reservations or catalog revisions conflict. Check duplicate source mappings and concurrent catalog edits before retrying.",
	"diagnostic.speaker-sync.rate-limited":
		"Conference Hall rate-limited the request. Wait at least retry-after-seconds before retrying; no automatic retry was attempted.",
	"diagnostic.speaker-sync.unexpected":
		"An unexpected error stopped this stage. Check its input files and permissions on a trusted runner; private exception contents are redacted.",
	"report.speaker-sync.private":
		"Speaker synchronization requires a private repository.",

	"action.communication.reconcile-attention": "Reconcile organizer attention",
	"report.attention.updated":
		"Organizer attention status is persisted on the issue. Review its current conditions and recovery guidance.",
	"report.attention.skipped":
		"The issue is not a configured meetup event; attention reconciliation was skipped.",
	"report.attention.failed":
		"Organizer attention could not be fully synchronized. Review the GitHub status and verify uncertain deliveries before recovery.",

	"action.publication.reconcile-feedback": "Reconcile meetup feedback",
	"report.feedback.skipped":
		"Feedback reconciliation was skipped; review the diagnostics for the reason.",
	"report.feedback.completed": "Feedback reconciliation completed.",
	"report.feedback.changes":
		"Issue changes persisted: {persisted, select, true {true} other {false}}; shared feedback link updated: {linkUpdated, select, true {true} other {false}}.",
	"report.feedback.guidance":
		"Review feedback diagnostics. Talk titles and speaker names follow the issue agenda; manage schedules, photos and removed talks in OpenFeedback.",
	"error.OpenFeedbackAgendaConflictError":
		"Several feedback talks or speakers match the issue agenda. Resolve duplicate names or edit one talk at a time before retrying; existing feedback was preserved.",
	"error.EventNotFoundError":
		"The event could not be found. Check the issue number and repository.",
	"error.EventConcurrentModificationError":
		"The event changed during reconciliation. Rerun against its latest version.",
	"error.GoogleDriveAssetRepositoryError":
		"Google Drive asset reconciliation failed. Check credentials, folders and permissions.",
	"error.GitHubEventRepositoryConfigurationError":
		"The event repository configuration is invalid. Check the repository settings.",
	"error.GitHubEventRepositoryScopeError":
		"The event is outside the configured repository scope.",
	"error.GitHubEventRepositoryResponseError":
		"GitHub returned an invalid event response. Check service availability and repository access.",
	"error.GitHubEventCommentRepositoryConfigurationError":
		"The comment repository configuration is invalid. Check the repository and bot settings.",
	"error.GitHubEventCommentRepositoryScopeError":
		"The comment is outside the configured repository scope.",
	"error.GitHubEventCommentRepositoryResponseError":
		"GitHub returned an invalid comment response. Check service availability and repository access.",
	"action.referential.validate": "Validate meetup referentials",
	"action.referential.sync-issue-form": "Synchronize meetup issue form",
	"action.event.reconcile": "Reconcile meetup event",
	"action.event.list-active": "List active meetup events",
	"action.communication.reconcile": "Reconcile meetup communications",
	"action.publication.reconcile-assets": "Reconcile meetup assets",
	"report.no-diagnostics": "No diagnostics.",
	"report.fix-applied":
		"fix applied: {applied, select, true {true} other {false}}",
	"report.failed": "Action failed: {reason}",
	"report.summary-unavailable":
		"The job summary could not be written; the action report is available in the logs and annotations.",
	"report.severity.error": "error",
	"report.severity.warning": "warning",
	"report.severity.info": "info",
	"report.execution.failed":
		"Action execution failed before a result was available.",
	"report.execution.guidance":
		"Review the action inputs and service configuration. Reproduce on a trusted runner if private debugging is required.",
	"report.error.unexpected":
		"Meetup automation failed; inspect debug logs using a trusted runner",
	"report.referential.valid": "Referentials: valid.",
	"report.referential.invalid": "Referentials: invalid.",
	"report.referential.counts":
		"Valid hosts: {hosts, number}; valid speakers: {speakers, number}.",
	"report.referential.guidance":
		"Correct the catalog fields listed below, then rerun validation. Field indexes are zero-based record positions.",
	"report.issue-form.blocked":
		"Issue form synchronization is blocked by invalid referentials.",
	"report.issue-form.stale": "Issue form is out of date.",
	"report.issue-form.drift-allowed":
		"Issue-form drift does not block this check. Synchronization can run after merge.",
	"report.issue-form.updated": "Issue form was updated.",
	"report.issue-form.current": "Issue form is up to date.",
	"report.issue-form.files": "Affected files: {files}.",
	"report.event.context": "Issue: #{issue}; mode: {mode}.",
	"report.event.skipped":
		"Skipped: the issue is not a configured meetup event.",
	"report.event.state":
		"Event state: {state}; ready: {ready, select, true {true} other {false}}.",
	"report.event.persisted":
		"Issue changes persisted: {persisted, select, true {true} other {false}}; diagnostic comment updated: {comment, select, true {true} other {false}}.",
	"report.event.guidance":
		"Resolve the event fields and pending tasks listed in the diagnostics.",
	"report.events.count": "Active events: {count, number}.",
	"report.events.issues": "Issue numbers: {issues}.",
	"report.events.empty": "No active meetup events were found.",
	"report.assets.skipped":
		"Asset reconciliation was skipped: the event is ineligible or prerequisites are incomplete.",
	"report.assets.completed": "Asset reconciliation completed.",
	"report.assets.counts":
		"Issue changes persisted: {persisted, select, true {true} other {false}}; asset files: {count, number}.",
	"report.communication.mode": "Communication mode: {mode}.",
	"report.communication.planned":
		"Planned: {planned, number}; due: {due, number}; dispatched: {dispatched, number}.",
	"report.communication.accepted":
		"Accepted: {accepted, number}; already recorded: {recorded, number}; deferred: {deferred, number}.",
	"report.communication.uncertain":
		"Uncertain: {uncertain, number}; rejected: {rejected, number}.",
	"report.communication.guidance":
		"Review checklist and delivery diagnostics before retrying.",
	"report.communication.uncertain-guidance":
		"Reconcile uncertain deliveries with the provider and ledger before any resend.",
	"report.communication.issue-reported":
		"Communication diagnostics are recorded in the meetup issue; reported errors do not fail this audit.",
	"report.communication.failed":
		"Communication reconciliation failed; inspect the diagnostic annotations and job summary.",
	"workflow.referential.failed":
		"Meetup referentials are invalid. Correct the catalog fields listed in the validation annotations and job summary.",
} as const;
