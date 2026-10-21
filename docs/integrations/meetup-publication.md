# Create and update Meetup events

The [publication workflow](../../.github/workflows/reconcile-meetup-event.md)
synchronizes one meetup issue through Meetup's organizer site. New events are
saved as drafts. Once the required event information is complete, automation
requests organizer approval in a GitHub issue comment and notifies the organizer
Slack channel. An organizer approves or rejects publication using the same
checkbox process as email batches. After approval, automation publishes the draft
in Meetup and verifies the result. No paid Meetup API access is needed.

**Meetup Link** contains the verified event URL for both drafts and published
events. Synchronization adds or updates this checkbox under **Communication**:

```markdown
- [ ] Meetup event published
```

It stays unchecked for drafts and becomes checked after synchronization verifies
publication in Meetup. The draft URL is available to organizers; viewing it may
require their Meetup login. Readiness and outgoing Meetup email links require a
checked task. Promotion in assets requires either confirmed Meetup publication
or a valid CNCF event link. A missing, unchecked, or duplicate publication task
does not confirm publication. Unrelated checklist tasks are preserved. The
recovery journal also retains the event identity for retries.

## Configure the consumer repository

Use a verified organizer account with password login and permission to schedule
events for the configured group. Set Actions secrets `MEETUP_EMAIL`,
`MEETUP_PASSWORD`, and `GEMINI_API_KEY`. Set variable `GEMINI_MODEL` to a Gemini
model with image input, structured output, and available API quota. The workflow
also requires the existing GitHub App and Conference Hall credentials; see
[setup](../usage/setup.md). Forward each credential explicitly, including the
Slack bot token and organizer channel used for approval notifications and reactions.
Pass the three required [publication URL inputs](../reference/configuration.md#publication-url-inputs)
from the same repository variables used by issue updates and audits. The Meetup
prefix selects the organizer group used by the browser and event URL validation.

Create `.github/meetup-publication.json` in the consumer repository:

```json
{
  "version": 1,
  "startTime": "18:45",
  "endTime": "20:45",
  "venues": {
    "host-0001": {
      "name": "Example Venue",
      "city": "Example City"
    }
  }
}
```

Times are explicit wall-clock times in the event's configured time zone
(`Europe/Paris`). The issue supplies the date. Both times must be on that date,
with the end after the start. The venue map uses stable host IDs and exact public
Meetup venue names and cities. Configure every intended host. Search must find
one matching location; the automation does not create venues or use private
contact addresses. These example values are synthetic.

The event must be open, scheduled in the future, have both host and speaker
confirmation labels, a title of at most 80 characters, a description, a resolved
agenda, and a configured venue. Cancelled, postponed, held, and closed events are
skipped. Incomplete or stale event data blocks synchronization before browser
access.
Selected talks and speaker names are resolved through the existing event journey.

Call `reconcile-meetup-event.yml` with the issue number, locale, GitHub App client
ID, Conference Hall event slug, Gemini model, organizer Slack channel, the three
publication URL inputs, and its six required secrets.
Consumer workflows must call it on event issue changes and on `issue_comment: [edited]` so an organizer's approval resumes publication automatically. A manual
run also supports recovery. Pin all consumer automation callers to the same
published full commit SHA so they understand the shared approval records.
The final action summary reports draft awaiting approval, synchronized,
skipped, or blocked. A draft result includes its review URL. Saving a secret alone
does not run synchronization.

For a consumer caller, replace `RELEASE_SHA` with the published automation revision:

```yaml
name: Synchronize Meetup event
on:
  issues:
    types: [opened, edited, reopened, labeled, unlabeled]
  issue_comment:
    types: [edited]
  workflow_dispatch:
    inputs:
      issue-number:
        description: Meetup issue number.
        required: true
        type: number
permissions:
  contents: read
jobs:
  synchronize:
    if: >-
      ${{ github.event_name == 'workflow_dispatch' ||
          (!github.event.issue.pull_request && github.event.issue.state == 'open' &&
           contains(github.event.issue.labels.*.name, 'meetup')) }}
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/reconcile-meetup-event.yml@RELEASE_SHA
    with:
      issue-number: ${{ github.event.issue.number || inputs.issue-number }}
      locale: fr
      github-app-client-id: ${{ vars.CI_BOT_APP_CLIENT_ID }}
      conference-hall-event: ${{ vars.CONFERENCE_HALL_EVENT }}
      meetup-event-url-prefix: ${{ vars.MEETUP_EVENT_URL_PREFIX }}
      community-event-url-prefixes: ${{ vars.COMMUNITY_EVENT_URL_PREFIXES }}
      asset-folder-url-prefix: ${{ vars.ASSET_FOLDER_URL_PREFIX }}
      gemini-model: ${{ vars.GEMINI_MODEL }}
      slack-organizer-channel-id: ${{ vars.SLACK_ORGANIZER_CHANNEL_ID }}
    secrets:
      github-app-private-key: ${{ secrets.CI_BOT_APP_PRIVATE_KEY }}
      conference-hall-api-key: ${{ secrets.CONFERENCE_HALL_API_KEY }}
      meetup-email: ${{ secrets.MEETUP_EMAIL }}
      meetup-password: ${{ secrets.MEETUP_PASSWORD }}
      gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
      slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
```

## Organizer approval

1. Complete the event's title, future date, times, description, resolved agenda,
   public venue, and host/speaker confirmations. The workflow saves the draft,
   fills **Meetup Link**, and creates a publication approval comment.
2. Follow the organizer Slack notification or open that comment in the issue.
   Review the linked draft, title, date, times, time zone, and venue.
3. Check **Approve publishing this Meetup event** or **Reject publishing this
   Meetup event** in the bot's comment. In French, the controls are **Approuver
   la publication de ce meetup** and **Refuser la publication de ce meetup**.
4. The comment-edit trigger runs synchronization. For an approved request,
   automation rechecks the issue, approval permission, draft identity and content,
   clicks **Publish**, verifies publication, and checks **Meetup event published**
   under **Communication**. **Meetup Link** stays available throughout.

Approval uses the same trusted bot records, comment edit history, repository
write permission checks, localized controls, and Slack decision reactions as
[email batch confirmation](communications.md#confirm-an-email-batch). Both
checkboxes checked, unauthorized edits, modified request metadata, or unavailable
verification do not authorize publication. Rejection keeps the event in draft.
An unchanged request retains its decision. While the event is a draft, changes
to the event title,
description/agenda, date, times, time zone, venue, or draft URL require a new
approval. The request links to the complete draft and records a digest of its
managed content without including account credentials or private contact details.

Publication eligibility uses the fields needed by Meetup. It does not depend on
already being published or on completing unrelated CNCF/Drive tasks. The
**Meetup event published** checkbox records verified status and cannot authorize
publication. A matching published event is reused on retries without publishing
again. Updates to an already published event preserve that status.

## Draft and update behavior

The managed fields are title, date, start/end times, description, and venue.
The description contains the issue description followed by its resolved talk
subjects and public speaker names. Updates load the existing editor and preserve
other event settings. Saving an unchanged event is a no-op. Drafts are published
only after an organizer approves the current draft.
Updates to already published events use **Save changes**. The workflow does not
announce events or post messages; those are separate organizer actions.

The adapter uses Meetup's English desktop editor, `/GROUP/schedule/` for
creation and `/GROUP/events/ID/edit/` for updates. For drafts, **Preview** saves
the draft and opens its identity URL. This enables durable recovery; **Save as
draft** redirects to the drafts list without that URL. The adapter reopens the
saved editor to verify publication status and every managed field. It does not
require public metadata for drafts.
An unavailable editor or changed selectors stops the run. An invalid or missing
linked remote event never falls back to creating a replacement.

Browser tests use synthetic pages and real Chromium, including draft creation,
draft and published updates, approved publication, no-op reruns, changed remote
content, guard failures, and saved-field verification. Draft saving never uses
Publish; the publication operation requires its approval guard to pass. They do not
establish live account permissions, challenge acceptance, or compatibility with every Meetup UI
experiment. The first organizer run is the live integration check. Meetup can
change its site independently of this repository.

## Interrupted runs and duplicate protection

The workflow shares the repository/issue concurrency group with the existing
event workflows, with cancellation disabled. Direct action callers must hold
that same lock. The journey reloads the issue immediately before submission and
before patching it. GitHub does not provide transactional issue writes; a final
race with a human edit remains possible.

Before creating a draft, it writes a pending journal comment on the issue. Only
comments authored by the configured GitHub App bot are accepted as journals.
After Meetup returns an event URL, it records that identity before verifying the
saved fields. A later run recovers the same draft or published event if the
run was interrupted. After successful verification, the URL and publication
checkbox are projected into the issue together.
Keep the journal and use the same App identity across runs.

If the remote outcome is unknown, the next run blocks creation. Inspect Meetup
and enter the verified draft or published event URL in **Meetup Link**. Leave
**Meetup event published** unchecked until publication is confirmed. Rerun to
verify and synchronize the link and checkbox.
If an organizer verifies that no event was created, they can delete the pending
journal comment before retrying. Never delete an uncertain journal merely to
retry a failed run. A conflicting journal/issue URL, duplicate journals, or
corrupt state stops synchronization. Existing manually published events must
have their URL entered in the issue before the first run; titles are not
identities. A draft supplied in **Meetup Link** remains linked with the publication
checkbox unchecked until approved publication is verified.

Diagnostics use the `publication.meetup.` prefix. `prerequisites`, `link`,
`conflict`, `uncertain`, and `authentication` require organizer correction and do
not fail the job. `approval-pending` and `approval-rejected` also leave the event
in draft without failing CI. `approval-unavailable` and
`approval-notification-failed` identify verification or notification failures.
`source`, `unavailable`, `editor`, and `verification` identify
technical failures. The shared report contains fixed codes and localized guidance.

## Login and challenge handling

Browser operations use fresh Chromium sessions and close them after use.
Sessions, credentials, cookies, traces, video, and page contents are not written
to artifacts or persistent caches. Credentials are masked before use.

Before entering credentials, the browser can attempt one hCaptcha challenge with
[the open-source hcaptcha-challenger](https://github.com/QIN2DIM/hcaptcha-challenger)
and Gemini. The solver is installed separately under its GPL-3.0-or-later license
using [locked Python dependencies](../../packages/adapter/meetup-event-gateway/python/requirements.txt).
It receives challenge images and instructions, not account credentials or event
content. Its Gemini key is sent through stdin, logs are discarded, and private
temporary files are removed after it exits. The process deadline is two minutes;
the library can retry provider requests within that deadline.

Unsupported challenges, including reCAPTCHA, one-time codes, and challenges after
credential submission, stop login. There are no automatic login retries. A
solver response alone does not establish authentication. Browser startup and
unexpected login-page failures are technical failures; failures handled by the
solver can instead appear as an unresolved challenge. Complete unsupported
verification interactively before rerunning.

Gemini API quota and billing are separate from a Workspace subscription. Challenge
images sent to Gemini are subject to
[Google's API terms](https://ai.google.dev/gemini-api/terms) and
[billing tier data-use rules](https://ai.google.dev/gemini-api/docs/billing).
