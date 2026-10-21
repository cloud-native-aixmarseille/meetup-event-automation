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

Register each bootstrap with
`await ActionRunner.run("action.<group>.<action>", operation, diagnosticsOutput)`.
The required boolean must match a consumed `diagnostics` output in the manifest.
Return `ActionReportData` on every normal path, including skipped or blocked work.

- Select short technical facts: mode, state, counts, persistence and affected files.
  Use the runtime catalog's `key=value` messages.
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
- Exceptions are redacted by `ActionFailurePresenter.publicErrorMessage`. Missing locale
  fails before execution and uses English. A summary-write failure emits a safe
  warning and preserves the original result.

The same policy applies to issue updates and scheduled audits. Never use
`continue-on-error` to hide a technical failure or make failure depend on where a
report was posted. A successful step can represent a safely blocked operation;
publish changes only when its completion evidence is present. Speaker catalog
publication requires the completed synchronization's `pr-title` output.
Mailing token creation and communications skip when completed asset outputs are absent.

## Organizer feedback

The final attention action is the sole diagnostic checklist writer. It merges
event, asset, feedback and communication reports through `OrganizerFeedback`.
It removes duplicates,
fixed items and derivative prerequisite messages. The comment presenter owns
concise localized guidance; raw diagnostic messages never become organizer text.
Slack reuses this checklist alongside verified approvals and recovery tasks.

The checklist is replaced only after all four stages report completed evaluation.
A missing, failed or concurrently invalidated stage preserves previous tasks;
new diagnostic tasks wait for a complete run. Technical attention still reports
the failed stage. This avoids treating an unevaluated task as resolved.
Successful consolidated persistence precedes retirement of an obsolete separate
communication report. Existing bot-state verification, pending delivery
reservations and post-event approval controls remain authoritative. Failed
comment persistence prevents a new Slack notification and fails the action.

Workflow stage results carry the consumed diagnostic outputs. Stages that did
not execute remain unknown, and dependent blockage cannot resolve an earlier
unverified technical failure. The final attention step runs after earlier
failures when its GitHub setup is available.

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
