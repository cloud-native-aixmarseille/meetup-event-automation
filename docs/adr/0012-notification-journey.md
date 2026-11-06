# Organizer notification journey and shared-channel routing

Status: Proposed 2026-11-06. No implementation authorized; pending organizer and
maintainer review.

Scope: how organizer attention is delivered across GitHub and the single shared
organizer Slack channel, covering content, cadence, re-notification thresholds,
and cross-surface deduplication. This refines the attention and reminder cadence
in [ADR 0004](0004-organizer-workflow.md) and reuses the Slack transport from
[ADR 0010](0010-social-publication.md). It does not change diagnostic
classification, checklist merging, durable attention state and reservations,
approval authority, or the mandatory
[feedback rules](../development/reporting.md#required-feedback-rules). Once
accepted and implemented, its decisions consolidate into ADR 0004.

## Context

Organizer feedback on 2026-11-06: "Je trouve que le bot il spam un peu trop, de
plus c'est couplé avec slack ça fait double emploi si tu suis tes notifs GH"
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
notification. Durable attention state, episodes, and reservations are unchanged;
only delivery content and frequency change.

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
of the existing message. Only a bounded, named set of urgent conditions triggers
a fresh notification: overdue approvals, blocked or uncertain external
deliveries, integration failures requiring action, and terminal pre-event
milestones (D-1 and D0). Lower-urgency conditions update the existing message in
place without re-alerting. Urgency derives from the existing application
`DiagnosticPolicy` classification and the `Europe/Paris` milestones, not a new
severity scheme.

### Consolidated reminder cadence

Reduce the number of routine milestone notifications, retaining terminal
(D-1, D0) and overdue reminders, and surfacing collapsed intermediate milestones
through in-message edits rather than fresh pings. This changes delivery frequency
only. It never clears, hides, or resolves a task.

### Cross-surface deduplication

A condition already visible on GitHub does not also raise a fresh Slack
notification unless it crosses the urgent threshold. Keep the no-all-clear,
reservation, and duplicate-protection rules intact so each surface carries
distinct signal.

### Feedback rules preserved

All unresolved tasks always remain in the GitHub checklist or follow-up comment.
Quieting Slack or consolidating cadence must never clear, hide, or resolve a
task. Missing, skipped, failed, or concurrently invalidated stages still preserve
previous tasks. Durable attention state and reservations are untouched. These are
the mandatory
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
Implementation adds a notification routing and formatting policy in the
communication domain, a cadence adjustment, and updated reporting and attention
regression coverage. The trade-off is that less-urgent items surface through
in-message edits that may not re-alert, so GitHub remains the place to see the
full current list.

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

- Non-urgent conditions already visible on GitHub do not raise a fresh Slack
  notification, while the named urgent set still escalates on the shared channel.
- Consolidating cadence and quieting Slack preserve every unresolved task;
  incomplete, missing, or failed stages retain previous tasks.
- Existing duplicate-protection, reservation, no-all-clear, and one-message-per
  -issue-per-day behavior continue to hold.

## Decision history and evidence

2026-11-06: proposed in response to organizer feedback about Slack spam and
duplication with GitHub notifications. Review fixed two constraints: the
organizer Slack channel is a single shared channel for all organizers, and Slack
must stay on. The proposal therefore reduces noise through a GitHub-detail and
Slack-pointer split, a higher re-notification threshold, and cadence
consolidation, rather than per-destination opt-in or disabling Slack. No
implementation is authorized yet. Once accepted and implemented, these decisions
consolidate into [ADR 0004](0004-organizer-workflow.md), which owns organizer
attention and reminders.
