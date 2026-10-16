# ADR 0014: Consolidate post-event follow-up

Status: Accepted

Date: 2026-10-16

## Context

Requiring an explicit held label before requesting thank-you approval adds an
organizer step after every meetup. Separate approval and attention comments and
Slack posts split the same follow-up work across multiple places. Organizers need
one view of email approval and the remaining manual tasks.

## Decision

Make scheduled events eligible for follow-up from the next calendar day in
`Europe/Paris`. Cancelled, postponed and unknown occurrences remain excluded.
An explicit held status remains supported. Eligibility does not assert occurrence
or add a held label; email delivery still requires a verified organizer decision.
Closure continues to stop task reminders without discarding delivery uncertainty.

Use one post-event comment for the thank-you batch, task progress, and attention
conditions. Show host and speaker thanks, slides, attendance import, and social
sharing. Create the overview even when email preparation is blocked or only manual
work remains. Upgrade that same comment when the safe email batch becomes ready.
Approval authorizes emails; manual task completion stays in the issue checklist.

Keep the two approval checkboxes from [ADR 0010](0010-checkbox-organizer-approval.md).
Exactly one selected choice is valid. Neither or both selected keeps the request
pending. Preserve current permission checks, trusted bot revision history, final
verified decisions, email fingerprints, and delivery reservations. Task progress
and locale changes do not revoke approval. Changed email inputs require a fresh
choice in the same comment. An overview without a prepared batch has no approval
control and cannot authorize dispatch.

Consolidate post-event notifications into the existing organizer attention flow.
Thank-you requests do not send a separate Slack approval message or decision
reaction. The grouped notification links to the shared comment, updates as tasks
change, and retains the daily cap, D+1/D+7 task milestones and overdue approval
reminders. Introduction approval notifications remain unchanged.

Persist attention reservations inside the trusted post-event comment. Retain the
attention adapter's validation and presentation ownership through injected ports;
no adapter imports another adapter. Copy existing notification state before
retiring an earlier attention view to a link. An uncertain Slack acknowledgement
continues blocking new posts, including after this transfer.

## Alternatives

- Retaining the held-label gate requires an additional organizer action that the
  email approval already provides.
- Separate approval and task comments preserve split status and notifications.
- Reaction-based approval requires polling because GitHub Actions does not trigger
  a workflow for an issue-comment reaction. Checkbox edits retain immediate
  processing through the existing caller.

## Consequences

Organizers use one place to approve thank-you emails and review all post-event
work. Email preparation failures remain visible without fabricating an approvable
batch. Shared persistence requires verifying a pending human decision before
progress writes and transferring reservations before retiring the old view.

This partially supersedes [ADR 0011](0011-final-organizer-decisions.md) for
thank-you Slack alerts and reactions, and [ADR 0013](0013-actionable-organizer-alerts.md)
for post-event eligibility, comments and notifications. Final decisions and
notification delivery safeguards remain in force.
