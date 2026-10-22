# ADR 0024: Scope actions and compose workflows

Status: Accepted; implemented.

## Context

Several public actions coupled independently changing effects: speaker imports
also projected forms, document reconciliation exported PDFs, event feedback
changed a repository-wide redirect, and attention persisted the diagnostic
checklist. These boundaries required unrelated credentials and made independent
work depend on an earlier provider failure. Issue updates and audits duplicated
the composition.

## Decision

Use scope-oriented action paths and one cohesive operation per action. Name
repeated desired-state operations `reconcile`, and keep `validate` and
`list-active` for their narrower contracts. Remove the old public paths without
aliases or compatibility wrappers. Public names express business capabilities:
speaker referentials, event publication, feedback, documents and communication.
Adapter implementations such as Conference Hall and the Meetup platform do not
appear in action paths, workflow filenames or operation display names. Their
identities remain in adapter wiring and integration configuration.
The complete supported inventory lives in
[the documentation index](../README.md#action-contracts).

Move composition into workflows. Both event triggers call `reconcile-meetup.yml`.
A workflow-level issue lock spans management, shared-link reconciliation and
reporting. Shared Kutt updates run under an additional repository/link lock and
select from freshly read active issues. Today takes priority over tomorrow;
ambiguous dates or missing poll URLs preserve the current target.

Document reconciliation passes public source identities and a canonical issue
revision to the PDF operation. The latter validates the revision and destination
before export. Independent email work can proceed after PDF failure when its
editable slides are ready. Checklist reconciliation owns diagnostic persistence;
attention follows successful checklist execution and preserves its existing
notification reservations. Incomplete grouped stages cannot clear old tasks.

Speaker reconciliation owns catalog and allocation files. Form reconciliation
runs next, and only a completed projection permits review-branch publication.
Stable catalog IDs, the durable review branch, Drive file IDs, approval decisions
and delivery reservations remain unchanged by the public API break.

This partially supersedes the action boundaries in
[Conference Hall](0012-conference-hall-talks-and-speakers.md),
[OpenFeedback](0012-synchronize-openfeedback-talks-and-speakers.md),
[organizer feedback](0021-separate-technical-and-organizer-feedback.md) and
[PDF export](0023-export-pdf-final-asset.md). Their domain policies and persistence
contracts remain in force except for the stated PDF failure isolation.

## Alternatives

- Retaining composed actions keeps unrelated credentials and failures coupled.
- Wrapper aliases preserve two public interfaces and obscure action ownership.
- A single global redirect job after the whole audit reduces reads but requires
  cross-matrix report aggregation. Per-issue composition permits consolidated
  reporting without private artifacts.

## Consequences

Consumers must pin a release containing the new paths. Repeated shared-link
reads increase API traffic during audits; idempotent target updates and a shared
lock prevent redundant writes. Audits limit parallelism to four issue pipelines;
the shared-link lock queues pending calls instead of replacing them. Separate actions reread authoritative state and
cannot make provider writes transactional with human edits. Snapshot validation,
provider revisions, durable reservations and bounded retries remain required.

Manifests own generated action/workflow references. The release documentation
job regenerates them. Runtime input tests, journey failure tests and workflow
contracts cover the new boundaries, failure isolation and locks.
