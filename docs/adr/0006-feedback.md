# Feedback events, agendas, and shared links

Status: Accepted decisions consolidated on 2026-10-23.

Scope: OpenFeedback resource synchronization, provider identity, and shared Kutt
link selection. Deployment prerequisites and recovery live in the
[feedback integration guide](../integrations/feedback.md).

## Context

Feedback must contain the selected talks and speakers while retaining organizer
edits, votes, and provider record identities. A shared short link serves several
events, so its selection and concurrency differ from reconciliation of one event.

## Accepted decisions

Use authenticated OpenFeedback event, talk, and speaker resource APIs. Require
list/read/create/update capabilities, record revisions, and conflict detection.
The required API extension must be deployed before enabling the client; its
implementation in this repository does not establish an external deployment.

Publication owns feedback identity and synchronization policies; adapters translate
provider resources. Journey coordinates event and repository effects. Keep
`feedback/reconcile-event` separate from `feedback/reconcile-short-link`, which
owns a repository-wide selection and shared target.

### Preserve resource identity and organizer edits

Project public talk titles, speaker names, and associations. Private contacts and
source locations never enter feedback payloads. Resolve every identity before
writing either collection. Reuse matching provider records, including manually
created records, and assign deterministic IDs to new resources. Ambiguity stops
the operation; it must not choose an arbitrary match.

A title edit retains the talk ID when its speaker group matches uniquely. A
speaker change retains the talk ID when its title matches uniquely. Changing both
may create a new talk. Organizers resolve ambiguous cases explicitly.

Write speakers before talks and skip unchanged values. Updates require each
record's last-read revision. Preserve omitted records, schedules, photos, settings,
and votes; never delete provider records automatically. A conflict stops the run.
Retries reread current state and resume with the same identities, preserving
already completed effects.

New polls require a complete resolved agenda and event prerequisites. An incomplete
agenda preserves an existing poll and permits independent metadata updates.
Recover the deterministic event after an issue-write failure. When agenda
synchronization is attempted, it must succeed before saving a new feedback URL.
Provider writes are individually atomic; the entire agenda is not a transaction.

### Select the shared target independently

Read fresh active issues under a dedicated repository-wide lock. Use the configured
local timezone and the day-before/day-of eligibility window, preferring today's
meetup over tomorrow's. A selected event without a usable feedback URL, or an
ambiguous selection, preserves the existing target and reports the blocker.
Do not redirect to a later event merely because the intended target is incomplete.

Separate event reconciliation from shared-link reconciliation and serialize each
at its own scope. An event can persist its feedback URL before the shared-link
workflow runs. The link operation evaluates current persisted event state rather
than trusting an earlier workflow snapshot.

## Alternatives and consequences

A combined agenda endpoint would add an aggregate outside OpenFeedback's resource
model. Unconditional updates would overwrite concurrent edits. A hosted JSON feed
would make synchronized records read-only in the admin UI, and direct database
writes would couple automation to provider storage and session credentials.

Resource APIs retain admin editing and isolate revision conflicts, but partial
success requires deterministic recovery. Separate shared-link reconciliation adds
a workflow boundary in exchange for correct repository-wide selection and locking.
Organizers remain responsible for photos, schedules, and removals.

## Decision history

| Original record                                                                             | Retained decision or later refinement                                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [0012: OpenFeedback resources](archive/0012-synchronize-openfeedback-talks-and-speakers.md) | Established public agenda projection, deterministic identity, revision checks, and preservation of unmanaged data. |
| [0024: Action scopes](archive/0024-scoped-actions-and-workflow-composition.md)              | Separated event synchronization from shared-link selection and its repository-wide lock.                           |
