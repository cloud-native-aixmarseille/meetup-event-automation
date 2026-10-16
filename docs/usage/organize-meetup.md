# Organize a meetup

This guide assumes the [repository setup](setup.md) is complete.

## Create the event

Open a new issue with the **Meetup** form. Fill in:

- **Event Title** and **Event Date** (`YYYY-MM-DD`).
- **Hoster**, using the generated choices.
- **Event Description**, with the public event summary.
- **Conference Hall proposals**, with one accepted proposal ID per line, in
  presentation order. You can leave this blank while planning the event.

The automation generates **Agenda** from the selected proposals after submission.
Edit talk content and speaker profiles in Conference Hall; source changes appear
on the next successful issue update or scheduled audit. See
[select talks](../integrations/conference-hall.md#select-talks).

For manually managed issues without proposal selections, maintain **Agenda** with
speaker references and descriptions using the
[referential guide](../reference/referentials.md#use-references-in-issues).

Select the aperitif and restaurant/bar options and use the checklists to track
preparation. Keep email addresses, phone numbers, and other contact details in
the private [referentials](../reference/referentials.md).

## Resolve diagnostics and confirm participation

The issue workflow normalizes supported fields and updates a diagnostic comment.
Read that comment and fix missing or invalid values. If the workflow fails, open
its Actions run to identify the failing integration or configuration.

The [active-issue audit](../../.github/workflows/check-active-meetup-issues.md)
records communication errors in a managed comment and can finish successfully
while those errors still need attention. Review the issue comments after an audit.

After confirming participation, add `hoster:confirmed` and `speakers:confirmed`.
The automation maintains the corresponding `needed` labels. A ready event has
valid required fields, resolved host and speaker references, both confirmations,
Meetup/CNCF/Drive links, and no blocking diagnostics. The **OpenFeedback Link**
field may stay empty until the automation creates the feedback event.

Publish the event on Meetup and the CNCF community platform, then fill in
**Meetup Link** and **CNCF Link**. These publishing steps are manual.

## Prepare assets and feedback

The workflow creates the [Drive event folder](../integrations/assets.md), copies
the configured templates, and fills **Drive Link**. Check the Actions report if
asset preparation fails.

Leave **OpenFeedback Link** empty to have the event created automatically using
the required [organization API key](../integrations/feedback.md). A valid existing
feedback URL is reused. Once talk subjects and speaker references are complete,
the automation creates the poll and synchronizes its title, talks and public
speaker names. Manage photos and schedules in OpenFeedback, and review obsolete
talks there; automation preserves existing votes and does not delete records.
See [agenda synchronization](../integrations/feedback.md#prepare-the-event) for
identity matching and concurrent-edit handling.

The shared Kutt link switches from the calendar day before the event through the
event day in `Europe/Paris`. If the earlier update was missed, run the daily audit
again on the event day. Check that the target contains the expected talks. See
[shared link timing](../integrations/feedback.md#update-the-shared-link) for
consecutive events and conflicting dates.

## Track communications

Meetup **organizers** manage preparation and approvals. The organizer Slack
channel receives approval requests and actionable organizer reminders. Post public Slack
event announcements manually and check their separate Communication tasks.
See [channel separation](../integrations/communications.md#organizer-and-public-channels).

Leave these two items unchecked in **Communication**:

- [ ] Mail introduction speakers
- [ ] Mail introduction hoster

Once the event is ready, review the approval request in the issue or follow its
Slack link. A repository writer can check **Approve sending this batch** in
the bot comment. The automation sends the emails and checks each item
independently after all requests for that group are accepted. Check an item
yourself only when that group's work was completed manually.

Check **Reject sending this batch** to refuse sending. Once processed, either
choice is final: the same comment shows the decision and organizer, with no
checkboxes. The original Slack message receives ✅ for approval or ❌ for
rejection. See [batch confirmation](../integrations/communications.md#confirm-an-email-batch)
for permissions, changed batches and notification recovery.

Keep `Mail thanks hoster` and `Mail thanks speakers` in **Post event** for the
corresponding follow-up emails. Missing tasks are not sent automatically. See
[communications](../integrations/communications.md) for supported task names,
message timing and recovery after partial failures.

## Postpone or cancel

Add `event:postponed` or `event:cancelled` and remove any other `event:*` status
label. If a postponed event is scheduled again, set the new date, remove
`event:postponed`, and review its links and unfinished tasks.

For a cancelled event, apply `event:cancelled` before closing the issue. Closing
an issue without an explicit status marks it held.

## Complete follow-up

From the day after the meetup in `Europe/Paris`, the next audit or issue update
starts follow-up automatically. Keep the issue open while completing tasks.
Mark cancelled or postponed events accordingly; no `event:held` label is needed
for follow-up, and the calendar alone does not change the recorded occurrence.

Use the single **Post-event follow-up** comment to review all five task statuses
and approve or reject the thank-you email batch. Leave both choices unchecked to
wait; checking both keeps the request pending. Approval sends only the unfinished
emails, with completion recorded after accepted dispatch. Publish slides, share
OpenFeedback reports, import attendance into CNCF, and complete social posts
manually in the issue checklist. The mailings workflow reports the email result.

The audit includes events with unfinished follow-up and delivery recovery.
Task reminders stop on closure, cancellation, or postponement; verify uncertain
external deliveries even after closing the issue.

## Resolve organizer attention

Before the event, use **Organizer attention** for the current task list. After the
event, use the shared **Post-event follow-up** comment for approval, task progress,
and diagnostics. Slack groups post-event reminders and approval into one message
per issue and local day and updates that message as conditions change. A later
failure may appear as an edit without a fresh notification.

See [organizer attention](../integrations/communications.md#organizer-attention)
for reminder timing and recovery.

## Conference Hall

Use the [Conference Hall guide](../integrations/conference-hall.md) for the required
`conference-hall-event` input, `conference-hall-api-key` secret, live profile refresh, reviewed identity
synchronization, selected proposals and consumer workflow triggers.
