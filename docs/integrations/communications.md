# Email and Slack communications

The issue-update and daily-audit workflows request organizer confirmation before
sending each introduction or thank-you email batch. They post the request on
the meetup issue and alert the meetup organizer Slack channel. Post-event approval,
task status, and reminders share one follow-up comment and grouped notifications.
Checked email tasks mean completed; after approval, the automation sends and checks them.

## Organizer and public channels

An **organizer** manages the meetup, approves email batches, and resolves
preparation issues. Approval requires repository write access or higher.

| Audience           | Channel selection                                                        | Behavior                                                                       |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Meetup organizers  | `SLACK_ORGANIZER_CHANNEL_ID`, passed as `slack-organizer-channel-id`     | The automation posts approval requests and grouped organizer attention.        |
| Public communities | The destination channels for the issue's public Slack announcement tasks | Organizers post event announcements manually and check those tasks themselves. |

Use a dedicated organizer channel, separate from public event announcement
channels. The `Slack - AixMarseille.Tech` and `Slack - OpenBaR` tasks
are manual. They neither route organizer messages nor enable automatic
public posting. The automation accepts no public announcement channel input.

## Configure delivery

Complete [repository setup](../usage/setup.md), including the issue workflow triggers
for issue edits, labels, closing, and approval checkbox edits. Both event workflows
require these settings:

| Consumer setting                      | Reusable workflow parameter        | Purpose                                |
| ------------------------------------- | ---------------------------------- | -------------------------------------- |
| Variable `CI_BOT_APP_CLIENT_ID`       | Input `github-app-client-id`       | Identify the GitHub App.               |
| Secret `CI_BOT_APP_PRIVATE_KEY`       | Secret `github-app-private-key`    | Create installation tokens.            |
| Secret `SLACK_BOT_TOKEN`              | Secret `slack-token`               | Send organizer requests and reminders. |
| Variable `SLACK_ORGANIZER_CHANNEL_ID` | Input `slack-organizer-channel-id` | Select the meetup organizer channel.   |

Install the GitHub App on `mailings` under the consumer repository's owner with
**Contents: write** permission. Each event workflow generates a separate
installation token scoped to that repository, uses it for email dispatch, and
revokes it at job completion. Configure the mailings repository to handle the
templates listed below.

The Slack bot must be a member of the organizer channel and have `chat:write`
and `reactions:write` bot scopes. These allow request messages and decision
reactions on those messages. Missing App or Slack settings fail the workflow;
complete setup before using automatic communications.

Email recipients come from the [referentials](../reference/referentials.md): the
host's first contact and each resolved speaker. Fix invalid records or
unresolved participants before using automatic communications.
[Conference Hall configuration](conference-hall.md) is required. Linked speaker addresses
and greeting names come from the live CFP snapshot shared with event evaluation.
Source edits affect unfinished batches on the next run and require fresh approval
when their fingerprint changes. Local IDs and accepted delivery records remain
stable; source failure blocks delivery instead of using cached addresses.

## Presentation link

Emails use the managed presentation file URL for `eventSlidesUrl`. Both event
workflows reconcile assets before communications and pass the `slides-link`
entry from the asset action's `drive-files` output together with `slides-ready`. Configure the presentation
template with `template_kind=slides`; see [Drive templates](assets.md#prepare-templates).

When calling the communication action directly, supply that URL as `slides-url`
and forward `slides-ready`. When assets cannot provide a presentation, pass an
empty `slides-url` with `slides-ready: false`. False holds due emails even when
the URL exists.
Managed content changes do not resend completed emails; approved batch inputs
include the stable URL, not a frozen document snapshot.
It accepts HTTPS Google Slides presentation links and Google Drive file links.
A due email batch with a missing or invalid link is held with the
`communication.slides-unavailable` diagnostic, before requesting approval.
The issue's **Drive Link** remains the event folder and is never used as a
fallback for the presentation. Organizer attention does not require a presentation.

## Speaker feedback results

Speaker thank-you emails include `speakerFeedbackTalks`, an array of talk titles
and direct OpenFeedback results URLs. Each recipient receives all of their talks;
co-speakers receive the same link for a shared talk. The links use existing
OpenFeedback talk IDs and `?displayVotes=true` so results are visible without
submitting a vote. The email does not use the shared Kutt link, whose target can
change for later meetups.

Both event workflows reconcile feedback before communications and forward the
OpenFeedback organization key. When calling the communication action directly,
pass `openfeedback-api-key`. The lookup reads the event's speakers and talks and
uses the same identity matching as [feedback synchronization](feedback.md).
It never creates or updates feedback records while preparing email.

A pending thank-you batch with speaker recipients is held before approval if the
OpenFeedback event link, credentials, agenda, or matching talks are unavailable.
Missing agenda, links or matching talks produce
`communication.feedback-unavailable` for organizers. Provider failures produce
`communication.feedback-fetch-failed` and fail CI. Synchronize the agenda or
restore source access before retrying.
Introductions and completed batches do not require feedback lookup. Link changes
are included in the approval fingerprint; accepted deliveries keep their existing
idempotency keys and are not resent.

Deploy the `mailings` speaker thank-you template that renders the
`speakerFeedbackTalks` array before enabling this automation revision. Its HTML
and plain-text versions include one results link per talk.

## Confirm an email batch

When a batch is due, the bot creates or updates a confirmation comment on the
meetup issue. It shows the batch type, event date and maximum recipient count,
with two choices:

```markdown
- [ ] Approve sending this batch
- [ ] Reject sending this batch
```

Expand **Review email details** to see each email's purpose, public host or
speaker name, and included event, presentation, or talk feedback links. Private
contact names, email addresses and venue addresses are excluded. The summary
stays collapsed by default and remains in the comment after a decision.
Large batches show a bounded summary with explicit counts of omitted emails or
links. The approval still covers the whole batch.

The details belong to the reviewed request. Editing them while selecting an
approval choice does not authorize sending; the bot restores the trusted request.

Click **Approve sending this batch** in that bot comment to authorize sending.
Click **Reject sending this batch** to refuse it. Leave both unchecked to wait;
selecting both does not approve anything.

When the automation processes a valid choice, it updates that same comment to
show **Approved** or **Rejected**, the organizer, and the decision time. The
checkboxes disappear. This decision is final for that batch revision: restoring
the old checkboxes or editing the final comment cannot change it. The automation
restores its recorded result on the next reconciliation. No separate decision
comment is posted.

Anyone with repository **write** access or higher can decide. The automation
reads the current comment and its last editor from GitHub, checks that editor's
current repository permission, and accepts only an unchanged request with one
selected choice. It saves the verified identity before authorizing dispatch and
rechecks the recorded organizer's write access before dispatch on later runs.
GitHub's bot-authored edit history protects the recorded decision against later
human edits. Missing or unverifiable history blocks sending. Edited request
descriptions, ineligible editors and approvals for a different batch cannot
authorize sending.

Slack links to the request; decisions are made on GitHub. Set `SLACK_ORGANIZER_CHANNEL_ID`
to the meetup organizer channel and invite the bot there. Each introduction
request sends one alert. Thank-you requests use the shared post-event notification
described below. Definitively rejected or rate-limited alerts can retry; an uncertain
acknowledgement is reported without automatically posting a duplicate. The
issue request remains usable if Slack fails.

For introductions, the automation adds a reaction to the original Slack request:
✅ for approval or ❌ for rejection. These reactions show the organizer's decision, not email
delivery. Failed reactions are retried on later reconciliations, including
after email tasks are complete. They do not reopen the decision or resend mail.

Introductions and thank-you emails require separate approvals. Approval covers
the host and speaker batch for the current email inputs, including recipient
addresses, templates, placeholders, date and policy. Only a fingerprint and
public facts are persisted; contact details never appear in the request.
Changes to those inputs create a new request in the same GitHub comment, with
unchecked choices. Introduction requests send a new Slack alert; thank-you requests
update the shared post-event status and follow its reminder policy. The previous
decision only applies to the previous revision; it is not reversed.
Completed tasks are skipped, and approval survives partial completion and safe
retries. Locale changes and unrelated checklist edits do not invalidate it.

The `issue_comment: edited` caller must be on the repository's default branch.
It runs for human edits to bot approval requests and ignores pull requests and
bot edits. The daily audit can also pick up a new decision. Both paths use the
same issue concurrency lock. See
[setup](../usage/setup.md#3-add-workflow-callers) for the caller configuration.
GitHub comment updates have no atomic compare-and-set guarantee. The automation
rechecks comments before persistence, but a final concurrent human edit can still
race a write. The choice is final once the automation records it. GitHub still
allows writers to edit comment text; such edits do not revoke the recorded
decision or cancel an in-flight send. Removing the metadata marker may prevent
the edit trigger from matching; the daily audit still verifies the comment.

Approval applies to email batches. Resolve missing participation confirmations
and integration errors before sending.

## Track email completion

Keep these items in the meetup issue:

```markdown
### Communication

- [ ] Mail introduction speakers
- [ ] Mail introduction hoster

### Post event

- [ ] Mail thanks hoster
- [ ] Mail thanks speakers
```

Leave a task unchecked for the automation to perform it when due and approved.
A checked item records completed work, including emails sent manually. Missing email
items are not scheduled; add them unchecked to enable their automation.
Other checklist items remain manual.

`Mail introduction speakers` tracks all speaker introduction emails, and
`Mail introduction hoster` tracks the host contact's introduction email. Each
item is completed independently after its recipients' dispatches are accepted.
The automation also supports these task names:

| Task                                             | Behavior                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `Mail introduction`                              | Tracks host and speaker introductions together; completes after both groups.                                  |
| `Thanks hoster`                                  | Tracks the host contact's thank-you email.                                                                    |
| `Thanks speakers`                                | Tracks speaker thank-you emails.                                                                              |
| `Thanks speakers and share openfeedback reports` | Sends speaker thank-you emails and adds a completed `Mail thanks speakers` item; report sharing stays manual. |

The automation checks a task only after all its recipient requests have been
accepted and recorded in the delivery ledger. Partial failures leave that task
unchecked. A later run retries definitively deferred requests and restores
missing completion checkmarks from accepted records without sending again.
Unchecking an already dispatched task does not resend its recorded messages.

## When messages are due

Dates use `Europe/Paris`. Email rows require a present, unchecked task and batch approval.

| Event condition                                  | Message                                             |
| ------------------------------------------------ | --------------------------------------------------- |
| Scheduled, ready, and today or in the future     | Introduction email to the host contact and speakers |
| Scheduled with a past date, or explicitly `held` | Thank-you email to the host contact and speakers    |
| Cancelled, postponed, or status unknown          | No email messages                                   |

Scheduled events become eligible on the next calendar day in `Europe/Paris`.
The next issue update or audit prepares the request. No `event:held` label is
required, and eligibility does not change the recorded occurrence. Cancellation
or postponement suppresses email planning. An explicit held status remains a
supported override.

Each email kind is sent at most once per issue and recipient under the current
policy. Changing the locale or repository revision does not resend recorded email.

The `<consumer-repository-owner>/mailings` repository receives a
`send-transactional-email` dispatch with a template, recipient, placeholders and
an idempotency key. It must support:

| Recipient    | Introduction template   | Thank-you template       |
| ------------ | ----------------------- | ------------------------ |
| Host contact | `meetup-intro-hosting`  | `meetup-thanks-hosting`  |
| Speaker      | `meetup-intro-speakers` | `meetup-thanks-speakers` |

A successful dispatch and a checked email task mean GitHub accepted the request,
not that the recipient received the email. Check the mailings repository's run
for the actual email result.

## Organizer attention

Both workflows finish with the [attention action](../../actions/communication/reconcile-attention/README.md),
under the shared repository/issue lock. Before the event, diagnostics and
organizer tasks share one checkbox comment. The final action merges all four
stages after complete successful evaluations, removes fixed and duplicate
diagnostics, and keeps the concrete cause when another stage reports a dependent
blockage. Incomplete or technically failed stages preserve the previous
diagnostic rows. The bot reuses the original diagnostic comment and adds only
tasks not already covered by its guidance. It verifies
bot revisions before retaining notification state, and saves that state in the
shared comment before removing a separate attention comment. Interrupted
consolidation resumes without losing a Slack reservation. From the day after the event, one **Post-event
follow-up** comment holds the thank-you approval, all five task statuses, and
remaining integration or delivery actions. Field corrections stay in the merged
diagnostic checklist. Follow-up tasks cover:

- Thank the host and speakers, with one approval for the complete email batch.
- Share slides on Meetup.
- Import attendance into CNCF.
- Share on social networks.

The task overview exists even if email preparation is blocked or emails are
already complete. Complete manual tasks in the issue's **Post event** checklist;
approval authorizes only the emails. Progress updates the shared comment without
invalidating a reviewed email batch. Email details, final decisions and delivery
reservations retain their existing verification rules. Earlier attention comments
link to this shared view, and their notification reservations are preserved.

Closed, cancelled, and postponed issues stop task reminders. Their integration
failures and skipped stages do not trigger Slack alerts; unverified external
deliveries continue to require recovery. Cancellation or postponement also hides
pending approval controls. Diagnostic and delivery-record comments remain the
detailed evidence sources.

| Condition                                                   | Reminder policy                                                                                                                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing confirmations, required data, or manual publication | First detection within seven days before the event; reminders at three days, one day, and event day.                                                                                                       |
| Missing or invalid date                                     | First detection, then weekly until scheduled or closed.                                                                                                                                                    |
| Pending email approval                                      | Introduction requests have a dedicated initial alert. Thank-you approval appears in the grouped follow-up notification. Pending approval reminders start after 24 hours, at most once per Paris-local day. |
| Integration failure or blocked delivery                     | Immediately, then at most once per Paris-local day.                                                                                                                                                        |
| Pending or uncertain external delivery                      | Retained until verified, including after cancellation or closure.                                                                                                                                          |
| Past scheduled or held event with unfinished follow-up      | First audit at least one day after the event, then at seven days; identifies email and manual tasks without claiming inbox delivery.                                                                       |

Milestones use `Europe/Paris` and the current clock. A missed audit sends only the
most urgent current reminder. Repeated runs do not repeat the same milestone.
Changing the date recomputes future milestones without replaying elapsed ones.
Approval or rejection resolves that request's pending condition; rejection stays
final for its batch revision. A returning condition starts a new episode. Locale,
wording, and unrelated issue edits do not restart episodes.

Due conditions share one Slack attention message per issue and local day. Later
changes edit that message using its stored channel and timestamp. Slack uses
[formatted text](https://docs.slack.dev/messaging/formatting-message-text/) with a
linked meetup heading, a localized date when known, and at most six actions.
Delivery recovery, approvals, and independent integration failures come first,
followed by the checklist's concrete field guidance, with Conference Hall blockers
before other missing fields. Repeated approval and delivery recovery actions keep
one direct link. Dependent email and feedback stages do not add duplicate
prerequisite alerts; independent technical failures retain their run links.
Previous failures in those stages remain unverified until an independent
evaluation succeeds. An overflow link gives the number of additional tasks.
Run and comment links have short labels; the heading links to the shared checklist.
Missing dates and lifecycle boilerplate are omitted from Slack. Automatic link
previews and channel-wide mentions are disabled. Only the first post requests
fresh attention. Later failures that day therefore require organizers to read
the updated message.
Resolution updates the current message without posting an all-clear. Post-event
notifications link to the shared follow-up comment and include thank-you approval;
they do not send a separate thank-you approval alert or decision reaction.
Introduction approval messages and their decision reactions remain separate. Public Slack
announcement checkboxes remain manual and use separate destinations.

The final action runs even after failed dependencies. Skipped or cancelled stages
are unknown and cannot resolve previous conditions. Expected organizer corrections keep CI successful; unexpected technical
failures fail under the [shared reporting policy](../development/reporting.md). Notification failures fail the attention action without
creating recursive notification conditions. GitHub status is persisted before
Slack is contacted, so it remains useful during a Slack outage. Failed GitHub
persistence prevents new Slack posts; workflow failures and GitHub's normal
notifications are the fallback. A schedule that never runs needs external
workflow monitoring.

Audits paginate open labelled meetup issues. Closed issues are excluded before
form parsing; their forms, assets and delivery records are left unchanged.
Issue-update workflows also skip closed issues, including approval edits.
Open cancelled and postponed issues remain eligible for delivery diagnostics.
Selection is bounded to 200 distinct open issues and 20 pages; exceeding either
limit fails listing explicitly instead of silently dropping work.

Keep an issue open until follow-up and delivery checks are complete. Closure
archives it; closure does not confirm that a pending or uncertain request was
accepted. If uncertainty is discovered after closure, check the provider and
resolve it explicitly using the retained records before considering another
send. Closed issues receive no automatic recovery checks or reminders. Do not
delete delivery or approval records to force retries. A past date alone never
confirms occurrence.

### Recover an uncertain attention post

Attention uses a versioned bot-owned record independent of email delivery and
approval decisions. During follow-up it is stored inside the shared comment.
The bot verifies authorship and the latest trusted bot revision before using it. Missing or deleted revision history fails closed. Do not edit or
delete metadata to force a retry.

A new Slack post is reserved in GitHub before dispatch. Definitive nonacceptance
can retry after at least five minutes or Slack's longer `Retry-After` interval.
An ambiguous acknowledgement retains its pending reservation across days and
locale changes. It never automatically posts again while the pending reservation remains.
Known-message updates can safely retry. This is duplicate protection, not an
exactly-once delivery guarantee; GitHub writes still have a final race with human
edits despite pre-write snapshot checks.

For an ambiguous post, inspect the configured organizer channel and the stored
reservation before any intervention. The automation retains the hold; rerunning
the workflow does not release it. Do not delete or edit trusted state to force a
retry. Email reservations and final approval decisions remain independent.

## Diagnose and recover

Inspect technical codes and counts in the workflow summary, and organizer
actions in the merged meetup checklist. Issue updates and scheduled audits use
the same failure policy: expected input corrections do not fail CI; source,
execution and persistence failures do. See the
[audit workflow contract](../../.github/workflows/check-active-meetup-issues.md).

The action report shows planned messages and attempted provider calls, including
rejected or uncertain attempts.
Organizer approval comments, Slack alerts and decision reactions are excluded
from these delivery counts.

A `communication.approval-notification-failed` diagnostic can mean a request
alert or decision reaction was not confirmed. Check the bot's channel membership
and its `chat:write` and `reactions:write` scopes. A request without a stored
Slack message reference cannot receive an automatic reaction. If its notification
is confirmed sent, this missing reaction reference is not a notification failure;
an unconfirmed notification remains actionable. The GitHub decision remains
authoritative and the automation does not post a duplicate alert. Do not delete approval comments or their edit history to retry a decision.

A `communication.checklist-concurrently-modified` diagnostic means the issue was
edited after dispatch. The automation preserves the edit and records the
remaining checklist work without failing CI. A
`communication.checklist-update-failed` diagnostic identifies an unexpected
rendering or persistence failure and fails CI. Run reconciliation again in either
case; accepted messages will not be sent twice.

The bot maintains one **Communication status** comment on the meetup issue. It
groups message requests by type and status, without listing recipients. The
duplicate-prevention records are stored in an HTML comment in its Markdown source;
organizers see the status summary, not JSON. Accepted email requests still require
checking the mail service for actual delivery.

Existing records prevent repeated delivery:

| Delivery result           | Next action                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `accepted`                | Check the provider if delivery is missing; the workflow does not resend                              |
| Rate limited (`deferred`) | Retry later; the reservation is released if the ledger update succeeds                               |
| `rejected`                | Fix the reported credential, destination or request issue; recorded attempts require manual recovery |
| `pending` or `uncertain`  | Check the provider before any manual recovery; the request may already have been accepted            |

There is no automatic reset for recorded deliveries. Do not delete the ledger to
retry one message: that would remove duplicate protection for other messages. A
failed ledger read or reservation prevents dispatch. Use the reusable workflows
so issue updates and audits share the same per-issue concurrency lock.

The [communication action](../../actions/communication/reconcile/README.md)
dispatches when event, checklist, approval, and delivery checks permit sending.
The reported `check` mode means global dispatch is blocked. A pending or rejected
approval disables mail within `dispatch` mode and reports a warning. Organizer
attention is reconciled independently by the final workflow action. The reusable workflows supply the
mailings token and hold the shared event lock.
