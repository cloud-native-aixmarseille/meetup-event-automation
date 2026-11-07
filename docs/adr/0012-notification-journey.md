# Organizer notification journey and shared-channel routing

Status: Accepted 2026-11-07. Decisions consolidated into
[ADR 0004](0004-organizer-workflow.md#shared-channel-notification-budget-2026-11-07).

The proposal below preserves the reviewed design and its original open questions.
The accepted implementation choices are recorded in ADR 0004.

Scope: how organizer attention is delivered across GitHub and the single shared
organizer Slack channel, covering content, cadence, re-notification thresholds,
and cross-surface deduplication. This refines the attention and reminder cadence
in [ADR 0004](0004-organizer-workflow.md) and reuses the Slack transport from
[ADR 0010](0010-social-publication.md). It does not change diagnostic
classification, checklist merging, existing attention and reservation guarantees,
approval authority, or the mandatory
[feedback rules](../development/reporting.md#required-feedback-rules). Once
accepted and implemented, its decisions consolidate into ADR 0004.

## Context

Organizer feedback on 2026-11-06: "Je trouve que le bot il spam un peu trop, de
plus c'est couplé avec Slack ça fait double emploi si tu suis tes notifs GH"
("The bot spams a bit too much, and it is coupled with Slack, which is redundant
if you follow your GitHub notifications").

Current behavior that produces this experience:

- The [attention action](../../actions/organizer/reconcile-attention/action.yml)
  requires `slack-token` and `slack-organizer-channel-id`. Slack is always
  contacted; there is no quieter mode.
- Every due condition posts or edits one Slack attention message per issue and
  local day, in addition to the GitHub checklist and follow-up comments.
- GitHub already notifies watchers, assignees, and issue participants on each bot
  comment and checklist edit. Organizers who follow GitHub receive the same
  content twice.
- The perceived spam is the sum of several streams: pre-event reminder milestones
  (D-7, D-3, D-1, D0), daily-capped integration-failure and pending-approval
  reminders, separate introduction approval alerts, and post-event follow-up.

Two constraints are fixed by review:

- There is one shared organizer channel for all organizers. No per-destination
  list and no per-organizer routing is possible; every post reaches everyone.
- Slack stays on. Disabling Slack or a GitHub-only mode is explicitly rejected.

GitHub is already authoritative: status is persisted before Slack is contacted
and stays usable during a Slack outage. The redundancy is that Slack re-pushes
what GitHub already pushes, rather than adding signal. Because the channel is
shared, each post reaches every organizer, which amplifies both the spam and the
duplication.

## Proposed decision

Keep the shared Slack channel always on. Make GitHub the detail surface and the
shared channel a concise, link-first escalation pointer, so the two surfaces stop
duplicating each other and the channel receives fewer, higher-value
notifications. Introduce a communication-domain notification routing policy that
classifies each due condition and decides whether it warrants a fresh Slack
notification. Existing attention episodes and reservation guarantees are preserved;
delivery content and frequency change, with shared accounting for the routine cap.

### Shared channel, always on

Slack remains mandatory and single-channel. There is no opt-out, no GitHub-only
mode, and no per-organizer or per-destination routing. Action inputs stay
`required: true` with no default, per the
[action interface rules](../development/README.md#action-interface-rules).
Because the channel is shared, quietness must come from suppression at the
source, not from targeting individuals. Organizers personalize their own volume
through native GitHub notification settings.

### GitHub is the detail surface, Slack is a concise pointer

Routine diagnostics and checklist updates live in the GitHub checklist and
follow-up comments, which hold the full detail and rely on GitHub's own
notifications. The shared channel carries a short, deduplicated summary of the
currently due actionable items with direct links into those comments. This
removes the duplication: GitHub owns the content, Slack owns the nudge. It
extends today's link-first attention message, where the heading already links to
the shared checklist, into an explicit "pointer, not reproduction" rule.

### Fewer fresh notifications via a higher re-notification threshold

Keep the existing one-message-per-issue-per-day grouping and edit-in-place
behavior. Raise the bar for what triggers a new notification versus a silent edit
of the existing message. A bounded, named set of urgent conditions can trigger
a fresh notification outside the routine cap: overdue approvals, blocked or
uncertain external deliveries, integration failures requiring action, and terminal pre-event
milestones (D-1 and D0). Lower-urgency conditions use the bounded routine cadence
below; other changes update the existing message in place without re-alerting.
Urgency derives from the existing application `DiagnosticPolicy` classification
and the `Europe/Paris` milestones, not a new severity scheme.

### Consolidated reminder cadence

Allow at most **three fresh routine Slack notifications in any rolling seven
local calendar days**, using `Europe/Paris` (today and the preceding six dates).
The budget applies to the shared organizer channel across all meetup issues,
not separately to each issue. It is a ceiling, not a target: post only when a
routine reminder is due. In-place edits do not consume the budget.

Once the budget is exhausted, update the existing message without a fresh ping.
If no message exists, keep the tasks visible on GitHub until the next eligible
reminder. Do not mark suppressed reminders as delivered or replay every skipped
milestone when capacity becomes available; reassess what is still due. This
changes delivery frequency only. It never clears, hides, or resolves a task.

The named urgent conditions above, including D-1, D0, and overdue approvals,
are exempt from this routine budget. They still obey the existing per-issue daily
grouping and reservation rules. Total channel notifications can therefore exceed
three in a week when urgent conditions occur.

Enforcing the shared cap requires durable channel-level accounting coordinated
across concurrent issue runs. Reserve a routine slot before posting; pending or
uncertain delivery holds that slot, and retries must not consume another one.
Preserve existing per-issue reservations and duplicate protection. The
communication domain owns the budget policy, orchestration coordinates it through
ports, and adapters own persistence and Slack delivery.

### Cross-surface deduplication

A condition already visible on GitHub raises a fresh Slack notification only
when an urgent escalation or a routine reminder within the cap is due. Keep the
no-all-clear, reservation, and duplicate-protection rules intact so each surface
carries distinct signal.

### Feedback rules preserved

All unresolved tasks always remain in the GitHub checklist or follow-up comment.
Quieting Slack or consolidating cadence must never clear, hide, or resolve a
task. Missing, skipped, failed, or concurrently invalidated stages still preserve
previous tasks. Existing attention and reservation guarantees are preserved.
These are the mandatory
[feedback rules](../development/reporting.md#required-feedback-rules).

## Alternatives and consequences

- Turning Slack off or adding a GitHub-only mode is rejected by the community.
- Per-organizer routing or preferences is impossible on one shared channel; it
  would rebuild identity and routing that each organizer's GitHub notification
  settings already provide.
- Reproducing full detail in Slack is the status quo and keeps the duplication
  and shared-channel spam.
- An escalation list of channels, as used for public social publication in
  [ADR 0010](0010-social-publication.md), does not apply here because organizer
  attention targets exactly one shared channel.

The shared channel keeps push escalation, which the community requires, but
becomes signal-rich: fewer fresh notifications, each a concise pointer to GitHub
for detail. Organizers who follow GitHub stop receiving the same content twice.
Implementation adds a communication-domain notification and cadence policy,
shared budget accounting, adapter-owned presentation, and updated reporting and
attention regression coverage. The shared cap requires coordination across issues;
the existing issue lock alone cannot enforce it. Less-urgent items may wait for
a fresh ping or surface through in-message edits, so GitHub remains the place to
see the full current list.

## Open questions

- Confirm the fresh-notification set: overdue approvals, blocked or uncertain
  deliveries, integration failures, and D-1 and D0.
- Confirm which intermediate reminders collapse to in-message edits (for example,
  drop fresh D-7 and D-3 pings while keeping D-1 and D0).
- Decide whether the post-event thank-you keeps its own notification or follows
  the concise-pointer rule.

## Validation to require on implementation

Add focused coverage under the
[reporting validation requirements](../development/reporting.md#validation):

- Across multiple meetup issues, at most three fresh routine notifications are
  allowed in any rolling seven local dates, including across week boundaries.
  In-place edits consume no slots; a fourth routine notification is suppressed.
- Concurrent runs, reruns, and pending or uncertain deliveries cannot exceed the
  shared budget or duplicate a post. Capacity returns as older slots leave the
  window, without replaying obsolete reminders.
- The named urgent set still escalates after the routine budget is exhausted,
  subject to existing per-issue daily grouping and reservation rules.
- Consolidating cadence and quieting Slack preserve every unresolved task;
  incomplete, missing, or failed stages retain previous tasks.
- Existing duplicate protection, reservations, no-all-clear behavior, and grouping
  by issue and local day continue to hold, including when no Slack message exists.

## Decision history and evidence

2026-11-07: implementation requested after review. The named urgent set is
accepted. D-7/D-3 and post-event reminders use the shared routine budget;
all approval types use grouped attention. Reservations remain in the existing
technical issue comments, with a queued repository/channel workflow lock.
A storage branch was explicitly rejected. Pending and uncertain attempts count
within the seven-date window; per-issue uncertainty still blocks replacement
posts after that window. Current operating details live in the
[organizer attention guide](../integrations/communications.md#organizer-attention).

2026-11-07: incorporated the
[review suggestion to cap routine reminders at three per week](https://github.com/cloud-native-aixmarseille/meetup-event-automation/pull/803#issuecomment-6684333090).
The proposal applies that ceiling across the shared channel over rolling local
dates, with explicit urgent exceptions and shared accounting requirements.
These details remain proposed; no runtime behavior changes in this PR.

2026-11-06: proposed in response to organizer feedback about Slack spam and
duplication with GitHub notifications. Review fixed two constraints: the
organizer Slack channel is a single shared channel for all organizers, and Slack
must stay on. The proposal therefore reduces noise through a GitHub-detail and
Slack-pointer split, a higher re-notification threshold, and cadence
consolidation, rather than per-destination opt-in or disabling Slack. No
implementation is authorized yet. Once accepted and implemented, these decisions
consolidate into [ADR 0004](0004-organizer-workflow.md), which owns organizer
attention and reminders.
