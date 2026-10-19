# Action contracts and workflow composition

Status: Accepted decisions consolidated on 2026-10-23.

Scope: public operations, inputs and outputs, workflow sequencing, credentials,
and concurrency. The [action inventory](../README.md#action-contracts) and
[interface rules](../development/README.md#action-interface-rules) describe the
supported surface.

## Context

Caller-selected modes often selected the same production behavior. Required but
unused inputs and outputs retained unnecessary contracts. Some actions combined
independent effects, forcing unrelated credentials and failure dependencies into
one operation. Issue updates and audits also duplicated orchestration.

## Accepted decisions

Use `actions/<scope>/<operation>` with one cohesive responsibility per action.
Names express business operations; provider names belong in adapter wiring.
Repeated desired-state operations use `reconcile`; validation and queries retain
their narrower names. Remove obsolete public paths without compatibility wrappers.

Require every action and workflow input explicitly, including locale and secrets,
with no default that conceals a caller decision. Retain a behavioral switch only
when operational callers use its alternatives. Remove constant, empty-only, or
null-only options together with unused runtime paths. Tests do not establish an
operational consumer.

Expose outputs only when they feed an actual decision, downstream input, or
published artifact. Trace forwarding chains to their final effect. Logging,
summaries, debugging, and possible future callers do not justify public outputs.
Manifests own the interface; release automation generates adjacent references.

Event, asset, feedback, and email reconciliation apply their supported operation
without a caller-selected preview mode. Issue-form reconciliation retains its
operational check/fix distinction. Readiness, approval, and durable state gate
effects; removing a mode does not remove those gates.

### Composition and failure boundaries

Event triggers and audits call `event-reconcile.yml`, which owns sequencing,
locking and reporting directly. Workflows load actions from their own pinned
revision and coordinate these separate responsibilities:

| Operation boundary                           | Reason                                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Speaker reconciliation, then form projection | Publish a review branch only after both catalog preparation and projection complete.                                    |
| Editable documents, then PDF export          | Pass public source identities and issue revision evidence; ready editable slides can support email despite PDF failure. |
| Event feedback and shared short link         | Event updates and repository-wide redirect selection have different credentials and locks.                              |
| Diagnostic checklist, then attention         | Notify only after consolidated checklist persistence succeeds.                                                          |
| Draft generation, review, and publication    | Content authorship, authority, and external publication are separate effects.                                           |

Hold the shared repository/issue lock across event mutations and reporting, with
non-cancelling execution. The shared feedback link additionally uses a
repository/link lock, queues pending calls, and rereads active issues. Audits
bound parallel issue pipelines. Each boundary revalidates authoritative snapshots;
workflow serialization cannot exclude human edits in an external service.

Group document/PDF evidence into the asset stage and event/shared-link evidence
into feedback. Incomplete members keep the group incomplete. Operation success
must include completion evidence before publishing prepared files or clearing
tasks. Technical failures follow the shared [organizer workflow](0004-organizer-workflow.md),
independently of whether the trigger was an issue edit or an audit.

### Lifecycle workflow organization (2026-10-23)

Prefix every internal workflow with `__`, including CI, maintenance and shared
helpers. Keep eight public entry points: preparation draft generation, promotion
post generation, publication, one-event reconciliation, active-event audit,
speaker reconciliation, catalog/form validation, and issue-form reconciliation.
The [lifecycle inventory](../usage/workflows.md) defines their paths.

Lifecycle phases organize use cases without adding event states or packages.
One-event reconciliation spans preparation, event day and follow-up. Domain
policies select due email and PDF eligibility from authoritative facts; remove
caller-controlled email-purpose and PDF toggles. Generation and publication stay
explicit. Catalog/form validation stays separate from PR-producing operations.

Preparation accepts a validated subset of title, description and cover. Promotion
accepts one destination/purpose target. Keep focused actions and their credential
boundaries, independent failure handling, separate proposals and approvals, and
one review after generation. Bind explicit text and image model settings to their
respective action interfaces. Reuse the organizer reporting helper and report only
selected generation operations plus review. Unselected outputs are not failures;
missing evidence from a selected output remains incomplete.

The public event workflow owns the issue lock through mutation and reporting.
It calls the internal shared-link helper directly, retaining the repository/link
lock and bounded audit concurrency. The reporting helper persists checklist
evidence before attention. A skipped PDF leaves the asset stage incomplete.
Contract checks follow reachable internal calls and outputs to their operational
consumers, excluding isolated CI exercises.

This supersedes the earlier names `reconcile-meetup.yml`,
`update-meetup-issue.yml`, `check-active-meetup-issues.yml`, and the public
provider-independent operation names in original record 0024. Existing consumers
must adopt a release containing the new paths and required inputs together.
Renaming a consumer file cannot make a new path available at an older revision.

## Alternatives and consequences

Keeping invariant options or wrapper aliases would preserve competing contracts
without an operational need. Combined actions would retain unrelated permission
and failure dependencies. Separate operations add workflow wiring and repeated
authoritative reads, but expose the actual effect and authorization boundaries.

Public interface changes require coordinated caller updates and release adoption.
Renaming operations does not reset catalog IDs, review branches, Drive identities,
approvals, or delivery reservations.

## Decision history

The first lifecycle organization on 2026-10-23 exposed thirteen public workflows.
Preparation and follow-up wrappers selected introductory or thank-you email and
whether to evaluate PDF export. A public event-day wrapper delegated shared-link
selection. Separate workflows exposed copy, cover, Slack and LinkedIn generation.
The internal `__event-reconcile.yml` was renamed to
`__event-reconciliation-pipeline.yml` to distinguish its orchestration role from
the public entry point.

The eight-entry-point decision above, accepted later on 2026-10-23, supersedes
those wrapper and selection choices. They duplicated entry points around the same
fact refresh and added phase flags where domain eligibility already decided due
work. Merge generation by organizer use case, remove the preparation/follow-up
wrappers and their flags, call the link helper directly, and inline the remaining
single-caller pipeline into `event-reconcile.yml`. Retain the original action,
approval, locking and failure boundaries.

| Original record                                                                                | Retained decision or later refinement                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0005: Communication reconciliation](archive/0005-single-communication-reconciliation-path.md) | Removed redundant dispatch modes and caller assertions. Its trigger-specific failure policy was replaced by [organizer feedback](0004-organizer-workflow.md). |
| [0006: Operational inputs](archive/0006-explicit-reconciliation-behavior.md)                   | Removed constant asset/feedback modes; the remaining event mode was later removed.                                                                            |
| [0017: Explicit interfaces](archive/0017-explicit-action-interfaces.md)                        | Required action inputs and operational output consumers. Explicit null recovery and workflow locale defaults were superseded by 0018.                         |
| [0018: Invariant options](archive/0018-remove-invariant-action-options.md)                     | Extended explicit inputs to workflows and removed unused recovery/event-mode paths.                                                                           |
| [0024: Scoped operations](archive/0024-scoped-actions-and-workflow-composition.md)             | Split independent effects, centralized workflow composition, and isolated PDF failure.                                                                        |
