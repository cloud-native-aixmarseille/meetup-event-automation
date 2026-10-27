# Publish events to Meetup and OCGroups

The [publication workflow](../../.github/workflows/event-publication-reconcile.yml)
reconciles one issue across its configured destinations. Meetup.com and CNCF Open
Community Groups (OCGroups) are adapters of the same process: recover an existing
event, save a draft, request organizer approval, publish the approved revision,
verify it, and update the issue. Each destination keeps its own approval and
recovery journal. One provider's approval never authorizes another.

## Configure destinations

Create `.github/event-publication.json` in the consumer repository. The schedule
and public venue map are shared by publication and [content review](content.md).
List each provider at most once. Remove a destination to disable its automation;
an explicit empty `destinations` array supports manual publication.

```json
{
  "version": 1,
  "startTime": "18:45",
  "endTime": "20:45",
  "venues": {
    "host-0001": {
      "name": "Example Venue",
      "city": "Example City",
      "address": "1 Example Road",
      "zipCode": "10000",
      "state": "Example State",
      "country": "France",
      "countryCode": "FR"
    }
  },
  "destinations": [
    { "provider": "meetup" },
    {
      "provider": "ocgroups",
      "eventUrlPrefix": "https://community.example.test/cncf/group/example/event/",
      "communityId": "20000000-0000-4000-8000-000000000002",
      "groupId": "30000000-0000-4000-8000-000000000003",
      "categoryId": "40000000-0000-4000-8000-000000000004",
      "registration": {
        "capacity": 75,
        "waitlist": true,
        "approvalRequired": false,
        "reminder": true
      }
    }
  ]
}
```

These values are synthetic. Times use the issue date and event timezone
(`Europe/Paris`). End time must follow start time on the same day. Ambiguous and
nonexistent local times are rejected. Venue keys are stable host IDs; configure
every intended host with public information, never private contact addresses.

Meetup requires the venue's `name` and `city`; its search must find exactly one
matching venue. It does not create venues. The required workflow input
`meetup-event-url-prefix` selects the authorized Meetup group.

OCGroups requires every venue field shown above, including an uppercase
two-letter country code. Obtain community, group, and category UUIDs from the
organizer dashboard. Its writable `eventUrlPrefix` must occur exactly in the
shared `community-event-url-prefixes` input. Accepted legacy community URLs are
not automatically writable targets. Registration capacity is an integer from 1
to 100000. Waitlist and attendee approval cannot both be enabled. Creation uses
one free public ticket tier, no recurring series, and no automatic online meeting.

## Configure credentials

Create one Actions secret, `PUBLICATION_CREDENTIALS`, containing JSON for exactly
the enabled providers. For both adapters:

```json
{
  "meetup": {
    "email": "organizer@example.test",
    "password": "REPLACE_WITH_MEETUP_PASSWORD",
    "ai": {
      "provider": "gemini",
      "model": "REPLACE_WITH_IMAGE_CAPABLE_MODEL",
      "apiKey": "REPLACE_WITH_AI_API_KEY"
    }
  },
  "ocgroups": {
    "username": "REPLACE_WITH_OCGROUPS_USERNAME",
    "password": "REPLACE_WITH_OCGROUPS_PASSWORD"
  }
}
```

Use verified organizer accounts with password login and event management
permission in the intended groups. Password whitespace is preserved. The runtime
masks the JSON and decoded credentials before validation or use. Do not commit
credentials. Disabled providers must be absent from the secret; an empty
collection uses `{}` if the publication workflow is invoked.

Meetup's `ai` object follows the shared [AI contract](../reference/configuration.md#ai-configuration).
Its model must support image input and structured output for challenge handling.
An OCGroups-only collection requires no Meetup or AI credentials and installs no
Python challenge solver. OCGroups SSO, MFA, CAPTCHA, unavailable password login,
and unexpected pages block login with organizer guidance.

Also configure the existing GitHub App, Conference Hall, Slack, and three
[publication URL inputs](../reference/configuration.md#publication-url-inputs).
All three URL inputs remain required for shared event readiness evaluation.
Keep `.github/meetup-content.json` for content review.

## Add the workflow caller

Use the same caller for one or both destinations. Replace `RELEASE_SHA` with a
published full automation commit SHA that includes this contract. Keep all
consumer automation callers on that revision so shared approvals and reminders
understand both publication kinds.

```yaml
name: Synchronize event publications
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
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/event-publication-reconcile.yml@RELEASE_SHA
    with:
      issue-number: ${{ github.event.issue.number || inputs.issue-number }}
      locale: fr
      github-app-client-id: ${{ vars.CI_BOT_APP_CLIENT_ID }}
      conference-hall-event: ${{ vars.CONFERENCE_HALL_EVENT }}
      meetup-event-url-prefix: ${{ vars.MEETUP_EVENT_URL_PREFIX }}
      community-event-url-prefixes: ${{ vars.COMMUNITY_EVENT_URL_PREFIXES }}
      asset-folder-url-prefix: ${{ vars.ASSET_FOLDER_URL_PREFIX }}
      slack-organizer-channel-id: ${{ vars.SLACK_ORGANIZER_CHANNEL_ID }}
    secrets:
      github-app-private-key: ${{ secrets.CI_BOT_APP_PRIVATE_KEY }}
      conference-hall-api-key: ${{ secrets.CONFERENCE_HALL_API_KEY }}
      publication-credentials: ${{ secrets.PUBLICATION_CREDENTIALS }}
      slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
```

The workflow installs Chromium from its pinned automation revision and prepares
extra runtime dependencies only for adapters that need them. It holds
`meetup-event-REPOSITORY_ID-ISSUE_NUMBER` with `cancel-in-progress: false` across
the whole collection. The App token grants consumer contents read and issues
write. Provider credentials reach only the reconciliation step. Direct action
callers must supply the same runtimes, permissions, and lock.

## Review and reconcile

The issue must be open, scheduled in the future, have confirmed host and
speakers, approved event copy, a resolved agenda, and a configured public venue.
Closed, cancelled, postponed, and held events are skipped by event editing.
Post-event attendee messaging follows the separate policy below. Incomplete or stale
source data blocks synchronization before browser access.

The workflow processes destinations in configuration order. Pending approval or
a provider failure does not prevent the other destination from proceeding. A
changed issue or invalidated content review stops further effects. Successful
operations remain durable even when another provider fails. The summary reports
status and review URL per destination, with localized diagnostics.

Review each linked draft from its bot-authored approval comment or organizer
Slack notification. Select exactly one approval choice using a repository
account with write permission. An unchanged request retains its decision;
changed managed content or identity requires fresh approval. Rejection leaves
the draft unpublished. Unauthorized edits, modified request metadata, both
checkboxes checked, and unavailable verification do not authorize publication.
The journal and issue checkboxes record state; they do not grant approval.

The workflow rereads the issue and trusted approval before publishing, then
reopens the saved event and verifies managed fields and publication status.
Unchanged events are not saved again. Published events are updated in place
without repeating publication. Missing linked events never trigger replacement
creation. Cancellation, postponement, unpublishing, deletion, and recurring
series remain manual operations.

| Provider | Issue projection                                                                                                                     | Provider constraints                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Meetup   | **Meetup Link** contains the verified draft or published URL. **Meetup event published** stays unchecked until verified publication. | Title at most 80 characters. Existing venue name and city must match.                                |
| OCGroups | **CNCF Link** contains only the verified published URL. Draft editor URLs stay in journals and approval comments.                    | Title at most 120 UTF-8 bytes; projected description at most 8000 bytes. Full public venue required. |

Meetup's checkbox controls readiness and outgoing Meetup email links. Unrelated
checklist tasks are preserved. Its English desktop editor uses **Preview** to
save drafts while retaining their identity URL; published updates use **Save
changes**. The adapter verifies all managed fields by reopening the editor.

For OCGroups, approval also binds target, category, and registration choices.
Publishing can send native notifications to group members and speakers; published
updates can send native reschedule notifications. Updates preserve ticketing and
attendee records. Changed draft registration settings block publication until
reconciled with configuration. Venue name is limited to 120 bytes; address, city,
state, and country to 100 bytes; postal code to 20 bytes. Automation manages venue
text and clears coordinates and state codes, which are not configured fields.

## Recover an interrupted run

Each provider reserves creation in a trusted bot-authored journal before saving.
It records the observed identity before saved-field verification or issue writes.
Retain journals and the same GitHub App identity across runs. Duplicate journals,
invalid identities, changed targets, and conflicting issue links block
synchronization. Link manually published events before the first run; titles are
not identities. Source rereads reduce races but cannot make GitHub issue updates
transactional with remote writes.

When an identity is recorded, inspect that event and rerun to verify and update
it. When only a pending reservation remains, inspect the provider dashboard
before retrying. Delete a reservation only after confirming no event was created.
Never remove uncertain state merely to retry.

For Meetup, enter the verified draft or published URL in **Meetup Link** to
recover an uncertain creation. Leave **Meetup event published** unchecked until
publication is verified. Existing journal formats and approval revisions remain
readable.

For OCGroups, recover the verified UUID and editor URL into the bot's
`community-publication:v1` journal. A maintainer can set `state` to `"saved"` and
add this identity while preserving the existing `target` exactly:

```json
{
  "id": "10000000-0000-4000-8000-000000000001",
  "reviewUrl": "https://community.example.test/dashboard/group/events/10000000-0000-4000-8000-000000000001/update"
}
```

The comment format is `<!-- community-publication:v1`, a newline,
`{"target":"EXISTING_TARGET","state":"saved","identity":{...}}`, a newline,
and `-->`. The public slug is added after verification and may change without
replacing the UUID. Never recover a draft through **CNCF Link**. If a supplied
link resolves to a draft, automation records its identity and clears the link
before approval. Use the dashboard's Events list if opening the editor URL shows
only part of the editor.

## Send slides to attendees

With Meetup configured, publication reconciliation also sends the public
presentation PDF through **Organizer tools > Contact attendees**. It selects
**Members based on RSVP status > Members who went to this event**. Attendance
must be recorded in Meetup; the automation does not change attendance or widen
the audience to all members or everyone who RSVP'd.

Keep the issue open. Delivery is eligible when the event is marked `held`, or
when a scheduled event's local date has ended. Cancelled, postponed and unknown
occurrences are skipped. [PDF export](assets.md#export-the-presentation-pdf)
verifies public placement and adds **Slides PDF** to the issue. That issue edit
triggers the publication caller above. No manual sharing checkbox is required.

For `locale: fr`, the message is:

- Subject: `Présentation du meetup`
- Message: `Bonjour, voici le lien vers les slides du meetup: <public PDF URL>`

The existing Meetup credentials and browser login are reused. Automation opens
the group's `messages/send/?eventId=<event ID>` page, clears every other RSVP
checkbox and selects **Members who went to this event**. It fills the subject and
rich-text message, then waits for **Email has been successfully sent!** after
submission. No attendees or email addresses are copied into GitHub.

Before sending, automation reserves one delivery per issue and Meetup event in
the communication ledger. Confirmed sending adds a completed task under
**Automated slide sharing**. A rerun restores a missing checkmark from the accepted
record without sending again. Updating the PDF, changing locale or unchecking the
task does not resend an accepted message.

An unconfirmed send keeps the record pending or uncertain and blocks automatic
retries. Check Meetup before resolving the record using
[delivery recovery](communications.md#diagnose-and-recover). Form failures
before reservation can be retried. A previously checked sharing task is respected
as work already done manually.

Browser tests use synthetic controls matching a saved Meetup page and its
confirmation. Selectors are also checked against that saved HTML. A live send
has not been tested.

## Browser runtime and validation

Browser operations use fresh Chromium sessions and close them after use. The
15-minute job uploads no artifacts and persists no browser sessions, page dumps,
cookies, traces, or video. Changed pages or unverified authentication stop the
operation. Expected organizer corrections and pending/rejected approvals do not
fail CI; source, startup, editor, and verification failures do. Diagnostics retain
`publication.meetup.` and `publication.community.` provider scopes.

Meetup can attempt one pre-credential hCaptcha challenge using
[hcaptcha-challenger](https://github.com/QIN2DIM/hcaptcha-challenger), installed
under its GPL-3.0-or-later license with [locked Python dependencies](../../packages/adapter/browser-authentication/hcaptcha-captcha-resolver/python/requirements.txt).
The solver receives challenge images and instructions, never account credentials
or event content. It checks the HTTPS page, refuses pages containing credentials,
and requires a CAPTCHA response after solving. The Gemini key travels through
stdin; logs are discarded and private temporary files removed. The deadline is
two minutes. Unsupported challenges, including reCAPTCHA, one-time codes, and
post-credential challenges, stop login. There are no automatic login retries.
Complete unsupported verification interactively before rerunning. Gemini quota,
billing, and data-use terms apply separately from a Workspace subscription.

Synthetic journey and Chromium tests cover lifecycle, provider isolation,
approval/source guards, recovery, no-op reruns, and saved-field verification.
Before enabling a consumer caller, an authorized organizer must validate login,
draft persistence, review access, publication, and native notifications on the
deployed instance. No live organizer run has been performed. See the
[decision record](../adr/0009-community-event-publication.md) for source evidence.
