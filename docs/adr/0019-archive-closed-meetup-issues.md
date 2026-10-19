# ADR 0019: Archive closed meetup issues

Status: Accepted; supersedes ADR 0013 for closed-issue audit eligibility.

Date: 2026-10-19

## Context

Closed meetup issues are archival records. Parsing their forms during every audit
produces diagnostics for obsolete form layouts and schedules unnecessary asset
and communication work. An uncertain delivery is a separate concern from event
validation and does not justify reconciling every archived event.

## Decision

Select only open labelled issues for scheduled and manual audits. Filter closed
records before decoding forms. Issue-update workflows also require an open issue,
including when an organizer edits an approval comment. Keep open issues eligible
regardless of cancellation, postponement or completion status so their current
rules and delivery diagnostics still apply.

Keep issues open until follow-up and delivery checks are complete. If delivery
uncertainty is found after closure, inspect provider records explicitly. Preserve
all existing delivery and approval records; never infer acceptance from closure
or reset records to force a send. Closed issues have no automatic recovery checks.

## Consequences

Archive size no longer consumes the bounded audit selection or produces form
validation failures. Closing an issue also stops automatic follow-up and reminders,
so organizers must finish that work before closing. Closure does not cancel an
external delivery already in progress or establish its outcome.

Current behavior and recovery guidance are maintained in the
[communication guide](../integrations/communications.md).
