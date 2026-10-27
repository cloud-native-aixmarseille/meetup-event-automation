# Organizer checklist, attention, and event follow-up

Status: Accepted decisions consolidated on 2026-10-23.

Scope: actionable diagnostics, reminder state, follow-up eligibility, and archive
eligibility. Current procedures live in the [reporting guide](../development/reporting.md)
and [organizer attention guide](../integrations/communications.md#organizer-attention).

## Context

Repeated stage reports and Slack alerts obscured the action an organizer needed
to take. A one-time notification could not represent an unresolved condition.
Treating incomplete preparation as a technical failure also made workflow status
misleading. Follow-up and archival processing needed explicit lifecycle rules.

## Accepted decisions

Use one application diagnostic policy for issue updates and audits. Expected
organizer corrections and approval waits block affected work without failing CI.
Unexpected exceptions, provider failures, and failed persistence remain technical
failures. Severity alone does not determine the exit status.

The shared action runner reports concise execution facts and safe diagnostic
codes. Owner-local presenters supply organizer wording. The checklist action is
the sole diagnostic checklist writer; it merges stage evidence, removes duplicate
prerequisites and fixed items, and preserves approval/recovery links. Slack reuses
that checklist instead of independently interpreting raw diagnostics.

Replace diagnostic tasks only after all required stages complete evaluation.
Missing, skipped, failed, or concurrently invalidated evidence cannot resolve old
tasks. Document/PDF and event/shared-link groups require all members. Draft review
has explicit content-stage evidence. Persist the checklist before attention can
send a new notification.

### Durable attention

The communication domain owns conditions, episodes, due windows, and delivery
state. Journey supplies typed evidence and an injected clock. GitHub stores
verified bot-owned state; Slack receives public, localized actions.

Use local calendar milestones and bounded reminders: pre-event preparation at
D-7, D-3, D-1, and D0; overdue approvals and integration problems follow their
own daily limits. Missing dates receive a weekly reminder. Missed audits select
the current relevant milestone rather than replaying every elapsed reminder.

Group due attention into one message per issue and local day. Update the known
message as conditions change; do not post an all-clear message. Returning
conditions create new semantic episodes, while locale and unrelated edits do not.
Reserve before posting. An uncertain acknowledgement blocks replacement posts
across later days until resolved; reruns do not clear that authority.

Pre-event guidance uses the diagnostic checklist. Post-event tasks and thank-you
approval share one overview. Moving between comment representations must preserve
verified reservations before retiring an older view. Notification delivery state
remains independent of email delivery and approval decisions.

### Lifecycle and follow-up

For open issues, a scheduled event becomes eligible for follow-up on the next
calendar day in `Europe/Paris`. Explicit held status remains supported. Cancelled,
postponed, and unknown occurrences remain excluded. Eligibility does not assert
that the event happened or add a held label; email still needs verified approval.

The shared overview includes host/speaker thanks, slides, attendance, and social
sharing. It exists even when only manual work remains or email preparation is
blocked. A non-authorizing overview gains approval controls only when a safe
batch is ready. Thank-you notifications use attention, with D+1/D+7 task milestones,
rather than separate Slack requests and reactions.

Closed meetup issues are archival. Filter them before form decoding and skip
issue-update reconciliation after closure, including approval edits. Keep open
issues eligible for evaluation even when cancelled or completed. Finish follow-up
before closure; later delivery uncertainty requires explicit provider investigation.
Closing an issue neither proves delivery nor cancels an external send.

### Organizer input

Accept visible Conference Hall proposal numbers and resolve canonical internal
identities automatically. Preserve explicit talk order and reject ambiguity.
Selecting a host resolves the host-needed condition; attendance confirmation
remains a separate organizer decision. See [referential ownership](0005-referentials.md).

Keep automated email tasks out of the creation form. Missing completion means
pending work; readiness, timing and explicit batch approval govern sending.
Journey records accepted host and speaker groups, and the issue codec renders
their completion in separate automated sections. Preserve existing completed
items and the delivery ledger so removing a status never resends accepted mail.

## Alternatives and consequences

Workflow-failure alerts miss ordinary unfinished work. Posting every diagnostic
on every run creates duplicate noise. Reusing email delivery keys for reminders
would compromise duplicate protection. A separate approval dashboard would add
identity and routing work to an existing GitHub review flow.

Durable episodes and shared projections add state and reconciliation work. The
daily cap means later problems may appear through updates rather than a new ping.
The system cannot detect a schedule that never runs; external monitoring remains
an operational responsibility.

## Decision history

On 2026-10-27, email scheduling stopped requiring an unchecked form task.
Previously, removing an email task disabled its scheduling. The form now contains
organizer work only, while explicit approval still controls sending. Completed
items remain valid records of automated or manually completed work.

| Original record                                                                       | Retained decision or later refinement                                                                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0013: Actionable attention](archive/0013-actionable-organizer-alerts.md)             | Established conditions, episodes, bounded reminders, and reservations. Separate comments and closed-issue recovery eligibility were later replaced.                       |
| [0014: Follow-up](archive/0014-consolidated-post-event-follow-up.md)                  | Added next-day eligibility and combined thank-you approval, tasks, and attention.                                                                                         |
| [0019: Closed issues](archive/0019-archive-closed-meetup-issues.md)                   | Excluded closed records from automatic reconciliation, including uncertainty checks.                                                                                      |
| [0020: Unified checklist](archive/0020-unified-organizer-checklist.md)                | Consolidated pre-event guidance and adopted visible proposal numbers.                                                                                                     |
| [0021: Technical feedback](archive/0021-separate-technical-and-organizer-feedback.md) | Unified failure classification and incomplete-stage preservation. The later [action boundaries](0002-action-contracts.md) separated checklist persistence from attention. |
