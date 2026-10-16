# ADR 0013: Reconcile actionable organizer alerts throughout the meetup lifecycle

Status: Accepted; partially superseded by
[ADR 0014](0014-consolidated-post-event-follow-up.md) for post-event eligibility, comments and notifications.

Date: 2026-10-14

## Context

The existing [communication journey](../integrations/communications.md) sends a
single readiness reminder when a scheduled meetup is not ready within seven days.
It also posts email approval requests and acknowledges final decisions on Slack,
as defined by [ADR 0008](0008-admin-confirmation-requests.md) and
[ADR 0011](0011-final-organizer-decisions.md). Action reports and managed issue
comments expose diagnostics, but organizers must inspect runs to discover many
failures, overdue tasks, or changes after that first reminder.

An accepted notification does not mean its underlying problem was fixed. Reusing
the one-time communication delivery key for ongoing alerts would either suppress
useful reminders or require unsafe deletion of delivery records. Conversely,
posting on every workflow run would make issue edits and retries noisy.

## Decision

Reconcile organizer attention as durable, actionable conditions. Use a managed
GitHub issue comment for the current status and the existing explicit organizer
Slack channel for attention. Preserve the email approval workflow, its final
decisions, and its delivery ledger. Public announcements remain manual.

### Conditions and proposed initial policy

Each condition has a stable code, affected public resource, severity, next
organizer action, and lifecycle eligibility. Compute it from typed event,
publication, communication, and execution results. Never parse rendered logs or
provider exception strings to decide whether to notify.

| Condition                                                                            | Initial attention and reminder policy                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing host/speaker confirmations, required event data, or manual publication tasks | First detection within seven days before the meetup; reminders on crossing three days, one day, and event day while unresolved.             |
| Email batch awaiting an organizer decision                                           | Existing approval request remains the initial alert; reminders after 24 hours pending, at most once per local day, linking to that request. |
| Integration failure or blocked/uncertain delivery requiring intervention             | First detection immediately, then at most once per local day while unresolved; include a safe recovery action and run link.                 |
| Scheduled date has passed without an occurrence decision                             | First audit after the date asks the organizer to mark held, postponed, or cancelled; remind after seven days.                               |
| Explicitly held event with unfinished follow-up                                      | First audit at least one day after its date, then after seven days; show unfinished email/manual tasks without assuming mail delivery.      |

Use the existing `Europe/Paris` event timezone and an injected clock. Evaluate
crossed milestones on the first subsequent run; if several were missed, emit
only the most urgent current reminder. Repeated runs in a milestone do not
repeat it. A date change recomputes future milestones without replaying elapsed
ones. Missing dates produce a data-quality condition on first detection, then
at most a weekly reminder until scheduled or closed.

A valid approval or rejection resolves the pending-decision condition. Rejection
is final for that batch revision and must not generate repeated approval nudges.
An accepted mail dispatch resolves dispatch work, not proof of inbox delivery.
Keep completion and uncertainty aligned with the existing communication rules.

Cancelled or postponed events stop preparation and follow-up reminders; closure
stops task reminders. Update known status messages to explain the stop. Do not
silently discard an uncertain external delivery merely because the event was
cancelled or closed: retain that recovery item until its outcome is verified.
Keep held events with unfinished follow-up eligible for audit, including closed
issues when delivery uncertainty still needs recovery. Bound and paginate audit
selection; a past date alone never proves that an event happened.

### Organizer experience and noise control

Maintain one bot-owned attention comment per issue, showing current conditions,
public event facts, next actions, and links to the relevant issue section,
approval request, or workflow run. Update it when conditions change and show
resolution in place. Existing diagnostic comments remain their detailed sources;
link to them rather than copy every diagnostic into a second report.

Group due conditions into one Slack attention message per issue and local day,
with the most urgent first. Edit that message as the day's conditions change;
newly discovered failures appear immediately in the GitHub comment and existing
Slack message. Only the first post requests fresh channel attention that day.
Use no automatic channel-wide mentions. Show a bounded list with a link to the
full issue status. Record this daily cap as a deliberate trade-off: later failures
on the same day may require organizers to read the updated status.

Email approval requests keep their existing dedicated messages, fingerprint
identity, and decision reactions. Include their overdue reminders in the daily
attention message, without creating another approval request or changing its
state. Public Slack announcement tasks use a separate destination and policy.

Update a known Slack message using its stored channel/timestamp and
[Slack's message update API][slack-update]. On resolution, update the current
attention message; do not post a new all-clear message. A condition that resolves
and later returns opens a new episode, still subject to the daily cap. Locale,
wording changes, and unrelated issue edits never open a new episode.

### Ownership, persistence, and failures

The communication domain owns attention conditions, episode transitions,
reminder policy, and notification delivery state. The journey gathers typed
results from the existing owners and supplies a clock. GitHub and Slack adapters
implement ports for durable state and presentation; runtime composition injects
them. Keep the approval interaction in its existing owner.

Run the same reconciliation from issue updates and scheduled/manual audits under
the existing repository/issue concurrency lock. Persist semantic condition keys,
episode IDs, due-window keys, timestamps, safe fingerprints, and opaque message
references in a versioned bot-owned record. Verify bot authorship and trusted
revision history before using editable comment metadata as delivery authority.
Keep this state separate from email completion and reservations.

Reserve a new Slack post before dispatch, then save its accepted reference.
Definitive nonacceptance can retry after backoff; ambiguous acknowledgement holds
that daily post pending investigation, including later runs and locale changes.
Do not issue another post for the same unresolved reservation on a later day.
Reconcile or explicitly recover it before resuming reminders. Updating a known
message can safely retry with the desired current content. Failure to persist
state prevents a new post. Do not claim exactly-once delivery.

Collect stage outcomes even when an earlier integration step fails. The final
attention action runs after failed dependencies, reloads the issue, and marks
unexecuted stages unknown; unknown is never resolved. Cancellation is not a
successful evaluation. Preserve each original action's failure policy, and
report notification failures through the shared runner without recursively
creating notification conditions about the notification itself.

GitHub status must remain useful when Slack is unavailable. If GitHub is also
unavailable, retain a failed workflow result and GitHub's normal workflow
notifications as the fallback; do not send untracked Slack posts. This design
cannot detect a consumer schedule that never runs, so external workflow
monitoring remains an operational responsibility.

All wording belongs in owner-local English/French ICU catalogs. Carry only
allowlisted public facts and diagnostic codes to presenters; exclude contact
records, raw errors, arbitrary paths, and provider payloads. Escape imported
text and keep Slack routing explicit as required by
[ADR 0009](0009-organizer-role-and-slack-channel.md).

## Alternatives

- Workflow-failure notifications alone miss unfinished business tasks and cannot
  explain which organizer action is needed.
- Posting every diagnostic on every run duplicates messages and hides urgency.
- Extending the one-time email ledger key or resetting it couples reminders to
  duplicate protection for mail.
- Adding a new dashboard, direct messages, or Slack approval buttons introduces
  routing and identity work without improving the existing GitHub decision path.

## Consequences and delivery

Organizers gain a current task view and bounded reminders through channels they
already use. Durable alert state and wider audit eligibility add implementation
work, and the daily cap trades immediate repeated pings for lower noise.

First introduce condition evaluation and the GitHub projection, then Slack
state and reminders, then failure-path and audit wiring. Replace the current
one-time readiness sender when the new policy is enabled so both never notify
for the same condition. Retain existing email and approval records. The milestone
and daily-cap defaults are proposed release policy, not new supported inputs.

Validate timezone boundaries, missed audits, date changes, resolution/reopening,
pending and rejected approvals, closed/held/cancelled events, concurrent runs,
rate limits, uncertain posts, failed persistence, forged state, localization,
and redaction with synthetic fixtures and a fixed clock. Update behavior,
architecture, public contracts, reporting, and localization checks when shipped.

[slack-update]: https://docs.slack.dev/reference/methods/chat.update/
