# Email and Slack communications

The issue-update and daily-audit workflows request organizer confirmation before
sending each introduction or thank-you email batch. They post the request on
the meetup issue and alert the meetup organizer Slack channel. Checked email tasks
mean completed; after approval, the automation sends and checks them.

## Organizer and public channels

An **organizer** manages the meetup, approves email batches, and resolves
preparation issues. Approval requires repository write access or higher.

| Audience           | Channel selection                                                        | Behavior                                                                       |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Meetup organizers  | `SLACK_ORGANIZER_CHANNEL_ID`, passed as `slack-organizer-channel-id`     | The automation posts approval requests and readiness reminders.                |
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

## Presentation link

Emails use the managed presentation file URL for `eventSlidesUrl`. Both event
workflows reconcile assets before communications and pass the `slides-link`
entry from the asset action's `drive-files` output. Configure the presentation
template with `template_kind=slides`; see [Drive templates](assets.md#prepare-templates).

When calling the communication action directly, supply that URL as `slides-url`.
It accepts HTTPS Google Slides presentation links and Google Drive file links.
A due email batch with a missing or invalid link is held with the
`communication.slides-unavailable` diagnostic, before requesting approval.
The issue's **Drive Link** remains the event folder and is never used as a
fallback for the presentation. Readiness reminders do not require a presentation.

## Confirm an email batch

When a batch is due, the bot creates or updates a confirmation comment on the
meetup issue. It shows the batch type, event date and maximum recipient count,
followed by two choices:

```markdown
- [ ] Approve sending this batch
- [ ] Reject sending this batch
```

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
to the meetup organizer channel and invite the bot there. Each request sends one
alert. Definitively rejected or rate-limited alerts can retry; an uncertain
acknowledgement is reported without automatically posting a duplicate. The
issue request remains usable if Slack fails.

The automation adds a reaction to the original Slack request: ✅ for approval
or ❌ for rejection. These reactions show the organizer's decision, not email
delivery. Failed reactions are retried on later reconciliations, including
after email tasks are complete. They do not reopen the decision or resend mail.

Introductions and thank-you emails require separate approvals. Approval covers
the host and speaker batch for the current email inputs, including recipient
addresses, templates, placeholders, date and policy. Only a fingerprint and
public facts are persisted; contact details never appear in the request.
Changes to those inputs create a new request in the same GitHub comment, with
unchecked choices and a new Slack alert. The previous decision only applies to
the previous revision; it is not reversed.
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

| Event condition                                                          | Message                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Scheduled, ready, and today or in the future                             | Introduction email to the host contact and speakers           |
| Scheduled, not ready, and within seven days of its date, including today | Organizer Slack reminder                                      |
| Explicitly marked `held`                                                 | Thank-you email to the host contact and speakers              |
| Cancelled, postponed, or status unknown                                  | No messages                                                   |
| Scheduled with a past date                                               | No messages; a past date does not confirm the meetup happened |

Each message kind is sent at most once per issue and recipient under the current
policy. The Slack reminder is not a daily repeat. Changing the locale or
repository revision does not resend previously recorded messages.

Readiness reminders include the event date, a direct link to the meetup issue,
and the outstanding validation items with actions to resolve them. They use the
workflow's language and omit private contact data. Update the issue fields or
confirmation labels named in the reminder.

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

## Diagnose and recover

Inspect `communication-diagnostics` on issue-update runs and the daily audit's
summary. The audit records communication errors in a managed issue comment and
succeeds once the comment is saved or confirmed current. Execution and comment
persistence failures still fail the job. See the
[audit workflow contract](../../.github/workflows/check-active-meetup-issues.md).

`planned-count` counts planned messages; `dispatched-count` counts
planned-message provider calls, including rejected or uncertain attempts.
Organizer approval comments, Slack alerts and decision reactions are excluded
from these delivery counts.

A `communication.approval-notification-failed` diagnostic can mean a request
alert or decision reaction was not confirmed. Check the bot's channel membership
and its `chat:write` and `reactions:write` scopes. A request without a stored
Slack message reference cannot receive an automatic reaction; its GitHub
decision remains authoritative and the automation does not post a duplicate
alert. Do not delete approval comments or their edit history to retry a decision.

A `communication.checklist-update-failed` diagnostic means dispatch results were
recorded but issue completion could not be saved, for example after a concurrent
edit. Run reconciliation again; accepted messages will not be sent twice.

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
approval disables mail within `dispatch` mode and reports a warning. Readiness
reminders are independent of email approval. The reusable workflows supply the
mailings token and hold the shared event lock.
