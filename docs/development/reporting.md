# Action reporting

CI reports execution facts. Meetup comments and Slack report organizer actions.
Use the shared reporting boundary for every public action; do not render the same
organizer guidance separately in each workflow step.

## Required feedback rules

These rules are mandatory for implementations, refactors, and reviews:

1. **CI reports concise technical facts.** Expected organizer corrections must
   not fail jobs. Bugs and unexpected technical failures must fail; use the shared
   classification instead of diagnostic severity or workflow-specific exceptions.
2. **Issue comments and Slack share concise, deduplicated actions.** Use the
   merged checklist, remove repeated prerequisites and filler, and preserve direct
   approval and recovery links.
3. **Incomplete runs preserve unresolved tasks.** Missing, skipped, failed, or
   concurrently invalidated stages must not clear previous tasks. Clear tasks
   only when completed evaluation confirms resolution.

## Technical action reports

Compose the shared `ActionRunner` instance and the action handler at the
bootstrap, then call
`await runner.run("action.<group>.<action>", action.run.bind(action), diagnosticsOutput)`.
The required boolean must match a consumed `diagnostics` output in the manifest.
Return `ActionReportData` on every normal path, including skipped or blocked work.

- Select short technical facts: mode, state, counts, persistence and affected files.
  Use the runtime catalog's `key=value` messages.
- Unexpected GraphQL failures retain only allowlisted error categories such as
  `RATE_LIMITED` or `FORBIDDEN`, alongside the redacted exception and bundle
  locations. Provider messages, query paths and arbitrary error types stay private.
- Retain redacted diagnostic codes, severity, field and `fixApplied` in consumed
  JSON outputs. Never include provider responses, credentials or contact records.
- `ActionReport` deduplicates facts and renders codes with safe field metadata in
  logs and an escaped summary. Expected validation diagnostics do not create
  failure annotations. Do not add introductions, recovery paragraphs or empty
  diagnostic messages to successful CI reports.
- `ActionRunner` applies the shared application `DiagnosticPolicy`. Expected
  validation, incomplete meetup data, proposal selection, catalog corrections,
  approval waits and reviewed recovery tasks do not fail CI. They still prevent
  dependent writes or dispatch until their own preconditions pass.
- Unexpected exceptions, source/API failures, unconfirmed new deliveries and
  failed persistence fail CI. Classification is independent of severity: a
  technical delivery warning can fail, while an invalid-input error does not.
  Unknown warning/error codes fail closed. Fixed diagnostics and informational
  results do not fail. Keep explicit `report.failure` only for technical failures
  without a diagnostic, such as unavailable notification evidence.
- Exceptions are redacted by the injected `ActionFailurePresenter`. Missing locale
  fails before execution and uses English. A summary-write failure emits a safe
  warning and preserves the original result.
- Reports retain specific, safe exception details in every locale. Runtime input
  validators use `RuntimeInputError` with authored field names and requirements,
  never rejected values. Stage-report failures identify the stage, group index,
  and diagnostic field. Unknown exceptions retain their standard error type,
  allowlisted network code, HTTP status, and up to three bundle locations per
  cause, with at most three causes. Arbitrary messages, provider bodies, absolute
  paths, and function names are not published. Bundle line/column locations refer
  to the action revision downloaded in the job's setup log.

The same policy applies to issue updates and scheduled audits. Never use
`continue-on-error` to hide a technical failure or make failure depend on where a
report was posted. A successful step can represent a safely blocked operation;
publish changes only when its completion evidence is present. Speaker catalog
publication requires the speaker action's `pr-title` and the form action's `completed` output.
Mailing token creation and communications skip when completed asset outputs are absent.

## Organizer feedback

The `organizer/reconcile-checklist` action is the sole diagnostic checklist writer. It merges
event, asset, feedback, communication and content reports through the journey's
`ReconcileOrganizerFeedback`. `OrganizerFeedback` decodes runtime inputs and
invokes that use case.
It removes duplicates,
fixed items and derivative prerequisite messages. The comment presenter owns
concise localized guidance; raw diagnostic messages never become organizer text.
Slack reuses this checklist alongside verified approvals and recovery tasks.

The base checklist is replaced only after all five stages report completed evaluation.
Document/PDF operations form the assets stage, and event-feedback/shared-link
operations form the feedback stage. Every member must report success before its
group is complete. A missing, failed or concurrently invalidated stage preserves previous tasks;
new diagnostic tasks wait for a complete run. Technical attention still reports
the failed stage, with the classified Meetup authentication or editor failure when
available. It uses only allowlisted codes and localized guidance, never raw
provider messages. This avoids treating an unevaluated task as resolved.
A reported, unconfirmed Meetup save has a concrete verification task; it replaces
an earlier technical alert instead of leaving that alert unverified.
Missing diagnostics, including `null` when GitHub suppresses a job output,
count as unreported evidence. They do not replace an explicit empty diagnostic
array and cannot clear checklist tasks.
Pending social publication decisions come from verified approval attention, with
one destination-specific link to each review comment. They are not duplicated as
diagnostic checklist instructions. A recorded decision clears its approval task
independently of delivery success; delivery failures keep their own run link.
Expired announcement windows are informational, and content review stops asking
for replacement announcement drafts after their current publication window closes.
Rescheduled events use the current schedule. Uncertain deliveries still require
verification after expiry; they are never treated as resolved by the clock.
Publication of an event that has already started is skipped, not reported as a
missing prerequisite. Post-event slides and email approval gates remain active.
Slides content conflicts appear once, with a document or slide link and repair
instructions, instead of repeated PDF and delivery prerequisite tasks. Standalone
PDF preparation and unknown diagnostics link to **Event / Reconcile active**;
rerun instructions identify the **Run workflow** button and **main** branch.

Social publication has an optional independent stage in the same canonical
comment. Reports include only the stages attempted by their workflow. An omitted
stage is outside that run's scope: it creates no alert and leaves existing evidence
unchanged. An explicitly included stage with missing, skipped, or suppressed
results remains unverified, even when the job succeeds.
A complete social evaluation replaces only its marked section; base
reconciliation preserves that section. Social reconciliation preserves the base
checklist and trusted attention state. Failed, skipped, technically invalid or
concurrently changed social evaluation retains its previous unresolved tasks.

Successful consolidated persistence precedes retirement of an obsolete separate
communication report. Existing bot-state verification, pending delivery
reservations and post-event approval controls remain authoritative. Failed
comment persistence prevents a new Slack notification and fails the action.

The shared post-event follow-up includes the merged checklist's concrete actions
and keeps specific approval and recovery links. It does not redirect organizers
to another diagnostic comment for blockers. Once the shared view is saved, the
separate diagnostic comment is minimized; its checklist remains intact for the
checklist writer and incomplete-run recovery.

After durable persistence, completed approval and attention comments are minimized
with GitHub's `RESOLVED` classifier. Their bodies, decisions, and history remain
intact. Outstanding checklist entries, active or unknown attention, and pending
notification reservations prevent resolution. Historical finalized proposals are
also reconciled. Reused comments are unminimized when new work appears, unless
they were minimized for another moderation reason. The visibility adapter
rechecks the current body before changing visibility; a concurrent edit or
unconfirmed mutation fails the operation and can be retried.

Workflow stage results carry the consumed diagnostic outputs. Included stages that
did not execute remain unknown, and dependent blockage cannot resolve an earlier
unverified technical failure. The reporting job runs after earlier failures when
its GitHub setup is available. Attention requires a successful checklist step;
a checklist write failure cannot be followed by a Slack notification.

Each attention episode retains its source run, so an unrelated successful audit
cannot replace a failure's details link. Missing-data guidance identifies the
affected public fields. Missing publication links and unpublished Meetup drafts
remain publication tasks rather than duplicate generic data warnings.
Publication readiness and pending or rejected approvals do not invalidate an
otherwise completed audit. Actual prerequisite failures still preserve earlier
unverified integration failures.
A reported prerequisite block replaces a stale unknown-stage alert with its
concrete diagnostic. It does not resolve earlier integration failures until the
blocked integration can actually be evaluated.

### Internal automation state

Content proposals, social delivery records, and Meetup and OCGroups publication
journals share one authoritative bot comment per issue. The
`meetup-automation-state:v1` envelope retains each adapter's serialized records
in independent sections. Organizer approval requests and checklists retain their
existing controls and visibility rules.

Every state write verifies the current section, preserves the other sections,
checks persistence by rereading, and minimizes the comment with `RESOLVED`.
Internal state stays minimized even while work is pending. Attention
reconciliation also consolidates and minimizes state before sending organizer
notifications, including runs with unchanged state. Visibility failures fail the
operation; a rerun retries without creating another comment. GitHub still shows
an expandable collapsed placeholder. Creation and minimization are separate API
requests, so a new comment can briefly appear before minimization succeeds.

Existing standalone records are imported together after verifying their author
and edit history. The oldest record comment becomes the consolidated comment;
the other originals are minimized only after successful readback. Their bodies
and edit histories remain available. Imported originals are no longer writable
state: changes to them block reconciliation instead of replacing current data.

The shared GitHub adapter owns the envelope, provenance, guarded writes, and
visibility. Feature adapters retain schema validation and transition checks.
Queries do not migrate or change visibility. Writes and attention reconciliation
own those effects and require the existing repository/issue workflow lock;
GitHub comment updates do not provide an atomic compare-and-swap operation.

Duplicate envelopes, unavailable or altered history, stale writes, and uncertain
readback block persistence. A maintainer with repository write access may recover
only the `meetup` and `community` sections, following the
[publication recovery procedures](../integrations/event-publication.md#recover-an-interrupted-run).
Proposal, social delivery, and import metadata changes must come from the trusted
bot. Every human recovery edit is checked against its preceding saved body.

The complete rendered comment must fit within the adapter's 60,000-character
budget. Oversized state fails before writing; it is never truncated or split into
additional comments. Preserve the consolidated comment and its edit history.
Recover damaged or deleted state before resuming automation.

## Validation

`tests/contracts/action-reporting.spec.ts` enforces runner and rendering ownership.
Changes to feedback behavior must include focused regression coverage for the
affected rules:

- Expected organizer corrections keep jobs successful while unexpected technical
  faults fail, including when diagnostics use the same severity.
- Issue comments and Slack reuse concise actions without repeating prerequisite
  messages; approval and recovery links remain available.
- Incomplete reports retain unresolved tasks; a completed rerun can clear
  confirmed resolutions without losing pending delivery or approval state.

Retain coverage for exception redaction, uncertain deliveries and publication
gates. Keep action manifests,
workflow callers and their references aligned; expose only outputs with an actual
consumer under the [action interface rules](README.md#action-interface-rules).
Run the [development checks](README.md#choose-checks-for-the-change) and rebuild
committed action bundles after production changes.
