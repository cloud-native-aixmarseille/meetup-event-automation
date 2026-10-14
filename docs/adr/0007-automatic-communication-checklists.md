# ADR 0007: Track automatic emails with completion checkboxes

Status: Accepted

Date: 2026-10-14

Partially supersedes the communication approval decisions in
[ADR 0001](0001-centralize-meetup-event-automation.md),
[ADR 0002](0002-runtime-dependency-injection.md),
[ADR 0004](0004-localize-generated-messages.md), and
[ADR 0005](0005-single-communication-reconciliation-path.md).

## Context

Organizers track introductions under Communication and thank-you work under
Post event. They need independent completion records for speaker and host
emails, including work performed manually.

## Decision

Use email tasks as completion records. A present, unchecked task is eligible
when the event's readiness and occurrence rules permit it and its batch has
[organizer approval](0008-admin-confirmation-requests.md). Checked or absent
tasks produce no new email intent. Introduction tasks require a scheduled,
ready event dated today or later; thank-you tasks require a held event.

The journey owns mapping between event tasks and recipient groups. It uses the
event codec and repository to persist completion after rechecking the source.
A task is checked only when every intended recipient in its group has an
accepted delivery record. A combined introduction task waits for both groups.
Tasks that include manual report sharing keep that work incomplete and receive
a separate completed email item.

Delivery reserves an intent before dispatch. Accepted records prevent duplicate
sends; uncertain and pending attempts require investigation. A deferred request
can retry after its reservation is released. Approval never resets the ledger.
The journey rechecks the issue before dispatch and before updating completion.

## Consequences

Organizers see each email task completed after accepted dispatch. Failed
checklist writes are repaired from the ledger on a later run without sending
again. Unchecking a completed task cannot request a resend.

A completed task means the mailings repository accepted the request; its
workflow owns actual email delivery. Partial or uncertain failures leave the
task incomplete. A final human edit can race a GitHub write because issue
updates do not provide an atomic compare-and-set operation.
