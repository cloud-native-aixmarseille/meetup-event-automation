# Organize a meetup

This guide assumes the [repository setup](setup.md) is complete.

## Create the event

Open a new issue with the **Meetup** form. Fill in:

- **Event Date** (`YYYY-MM-DD`).
- **Hoster**, using the generated choices.
- **Conference Hall proposals**, with one accepted proposal number per line, in
  presentation order. You can leave this blank while planning the event.

The automation generates **Agenda** from the selected proposals after submission.
Edit talk content and speaker profiles in Conference Hall; source changes appear
on the next successful issue update or scheduled audit. See
[select talks](../integrations/conference-hall.md#select-talks).

Automation maintains **Event Title**, **Event Description**, **Meetup Link**,
**CNCF Link**, **Drive Link** and **OpenFeedback Link**. The configured workflows
add them to the issue as their steps complete. Generate and approve the title and
description through [content review](../integrations/content.md); automation
applies the approved text. The issue starts with the title `[Meetup]`. After title
approval, automation updates both **Event Title** in the body and the issue title.

For manually managed issues without proposal selections, maintain **Agenda** with
speaker references and descriptions using the
[referential guide](../reference/referentials.md#use-references-in-issues).

Select the aperitif and restaurant/bar options. The form checklists contain
organizer tasks. Automation adds email completion to the issue after approval
and accepted delivery.

- **Event materials** covers adding community news and surveys, and collecting
  host and speaker slides. Approve covers and announcement drafts
  through [content review](../integrations/content.md#decide-and-apply).
- **Communication** tracks publication of the event announcement and registration
  link on Slack - AixMarseille.Tech, Slack - OpenBaR and LinkedIn.
- **Event logistics** covers games and goodies. Check each task once arranged or
  confirmed unnecessary.
- **Post event** tracks attendee import into CNCF and the event recap with photos
  and useful links on LinkedIn.

Automation exports the presentation PDF and sends its link through Meetup to
members marked as having attended. It adds **Slides PDF** and records completion
under **Automated slide sharing**. See [attendee slide delivery](../integrations/event-publication.md#send-slides-to-attendees).

Keep email addresses, phone numbers, and other contact details in
the private [referentials](../reference/referentials.md).

## Resolve diagnostics and confirm participation

The issue workflow normalizes supported fields and finishes with one organizer
checklist covering event details, assets, feedback and communications. Fix the
listed values or complete the requested tasks. Expected corrections and pending
approvals block the affected operation without failing CI.

The [active-issue audit](../../.github/workflows/event-reconcile-active.yml)
uses the same policy. Unexpected execution, source or persistence failures fail
the workflow; open its Actions run for technical codes and counts. An incomplete
evaluation preserves the previous checklist and reports the affected stage.

After confirming participation, add `hoster:confirmed` and `speakers:confirmed`.
Selecting a host removes `hoster:needed`; it does not confirm participation.
Speaker `needed` labels follow their confirmation state. A ready event has
valid required fields, resolved host and speaker references, both confirmations,
Meetup/CNCF/Drive links, a checked **Meetup event published** task in
**Communication**, and no blocking diagnostics. **OpenFeedback Link** appears
when automation creates the feedback event.

Use [event publication synchronization](../integrations/event-publication.md) for
Meetup and CNCF / OCGroups. Review each destination's draft through its approval
comment or Slack link, then approve publication. Each destination requires its
own approval. Automation fills **Meetup Link** with the verified draft or
published URL and **CNCF Link** with the verified published URL. It also checks
**Meetup event published** under **Communication** after verified publication.
Rejecting a request leaves that destination's event in draft.

## Prepare assets and feedback

The workflow creates the [Drive event folder](../integrations/assets.md), copies
the configured templates, and fills **Drive Link**. Follow the organizer checklist
for content corrections and the linked Actions run for technical failures.

Automation creates the OpenFeedback event using the required
[organization API key](../integrations/feedback.md) and adds **OpenFeedback Link**
to the issue. A valid existing feedback URL is reused. Once talk subjects and
speaker references are complete, automation synchronizes the poll's title, talks
and public speaker names. Manage photos and schedules in OpenFeedback, and review
obsolete talks there; automation preserves existing votes and does not delete records.
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
event announcements through the configured [social publication workflow](../integrations/social-publication.md)
or record their manual completion in the separate Communication tasks.
See [channel separation](../integrations/communications.md#organizer-and-public-channels).

Once the event is ready, automation requests approval for host and speaker
introduction emails. Review the request in the issue or follow its
Slack link. A repository writer can check **Approve sending this batch** in
the bot comment. Automation sends the emails and adds each completed item under
**Automated introduction emails** after all requests for that group are accepted.
No email checkbox is needed in the form.

Check **Reject sending this batch** to refuse sending. Once processed, either
choice is final: the same comment shows the decision and organizer, with no
checkboxes. The original Slack message receives ✅ for approval or ❌ for
rejection. See [batch confirmation](../integrations/communications.md#confirm-an-email-batch)
for permissions, changed batches and notification recovery.

Thank-you emails follow the same approval process after the event. Automation
adds completion under **Automated thank-you emails**. See
[communications](../integrations/communications.md#track-email-completion) for
manually sent emails, message timing and recovery after partial failures.

## Record participants during the event

Ask participants to complete the attendance form during the meetup, including
those registered through Meetup.com. Follow
[registration reconciliation](../integrations/registrations.md) for collection,
reviewed source mapping, and mandatory post-event OCGroups reporting.

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
emails, with completion recorded after accepted dispatch. Speaker emails include
OpenFeedback report links. Slide sharing on Meetup is automatic. Follow
[registration reconciliation](../integrations/registrations.md) for OCGroups
reporting and its completion requirements. Post the event recap and record
completed tasks in the issue checklist. The mailings workflow reports the email
result.

Keep the issue open while follow-up or delivery checks remain unfinished.
Closing it archives the event and excludes it from automatic audits and issue
updates. Check the provider explicitly if a delivery outcome is uncertain after
closure; see [delivery recovery](../integrations/communications.md).

## Resolve organizer attention

Use the merged diagnostic checklist for missing fields, content corrections and
publication tasks. After the event, the **Post-event follow-up** comment holds
approval controls, task progress and remaining integration or delivery actions.
Slack combines the relevant checklist items, approvals and recovery tasks in one
message per issue and local day. Later changes update that message, so a failure
may appear as an edit without a fresh notification.

See [organizer attention](../integrations/communications.md#organizer-attention)
for reminder timing and recovery.

## Conference Hall

Use the [Conference Hall guide](../integrations/conference-hall.md) for the required
`conference-hall-event` input, `conference-hall-api-key` secret, live profile refresh, reviewed identity
synchronization, selected proposals and consumer workflow triggers.

## Draft and review promotional content

Use [content generation and review](../integrations/content.md) for titles,
descriptions, cover candidates, social announcements, and D-7/D0 reminders.
Each revision needs content approval before use; email and initial Meetup
publication keep their separate approvals. Social posting has its own [publication approval](../integrations/social-publication.md).
