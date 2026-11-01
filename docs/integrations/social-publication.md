# Publish to LinkedIn and Slack

The promotion workflows publish reviewed announcements and D-7/D0 reminders to
configured Slack channels and one community LinkedIn Page. They use separate
publication approvals, retain each destination's delivery history, and require no
AI credentials. [Content generation and review](content.md) prepares the copy
and LinkedIn announcement image.

## Configure destinations

Commit `.github/meetup-social.json` when using social publication, draft
generation, or review of content proposals and organizer submissions. Use an
explicit empty `destinations` array when using content review with social
publication disabled; a missing file fails validation for these operations.
[Automatic event copy preparation](content.md#configure-the-repository) also
requires this file; an empty list does not enable social publication.

```json
{
  "version": 1,
  "destinations": [
    {
      "key": "slack-engineering",
      "provider": "slack",
      "label": "Engineering announcements",
      "workspaceId": "TEXAMPLE",
      "channelId": "CEXAMPLE"
    },
    {
      "key": "community-page",
      "provider": "linkedin",
      "label": "LinkedIn announcement",
      "organizationUrn": "urn:li:organization:123"
    }
  ]
}
```

Replace the synthetic remote IDs. Keys start with a lowercase letter, contain
only lowercase letters, digits and hyphens, and have at most 64 characters.
Labels contain up to 100 characters. Duplicate keys or remote targets are
rejected. The list supports up to 50 destinations and at most one LinkedIn Page.
Slack channels may span multiple workspaces. Only channels in this list can be
selected or published to; there is no predefined community list or fallback.

Use `<key>:announcement`, `<key>:d7`, or `<key>:d0` as a draft target. To generate
for every configured destination, use `*:announcement`, `*:d7`, or `*:d0`.
The [promotion generation workflow](content.md#generate-a-proposal) owns destination
selection and sequential execution; consumers only forward the selector. Adding or
replacing a destination requires a new content review and publication approval.
Removing it blocks pending sends. Renaming a key or label changes the review but
preserves the delivery identity for the same remote channel or Page.

A destination's `label` can match an existing Communication checklist task.
Automation checks that task only when every configured destination sharing the
label has completed its announcement for the current event date. It does not
add tasks to the form. Checked announcement tasks are retained as manual
completion during adoption; reminders have independent records. Clearing a
completed checkbox never authorizes another send.

## Configure credentials and media

Create a repository secret, for example `SOCIAL_CREDENTIALS`, and forward it as
`social-credentials`. Its JSON includes only configured providers and workspaces:

```json
{
  "slack": {
    "TEXAMPLE": "BOT_TOKEN_FOR_THIS_WORKSPACE"
  },
  "linkedin": {
    "accessToken": "PAGE_AUTHORIZED_ACCESS_TOKEN",
    "googleCredentials": {
      "type": "service_account",
      "client_email": "SERVICE_ACCOUNT_EMAIL",
      "private_key": "SERVICE_ACCOUNT_PRIVATE_KEY"
    }
  }
}
```

Use the complete Google service-account JSON object for `googleCredentials`.
Omit `linkedin` for Slack-only publication; omit `slack` when no Slack channels
are configured. An empty destination list uses `{}`. Missing credentials or
credentials for an unconfigured provider/workspace fail validation. Keep tokens
in secrets, separate from committed destination IDs.

For Slack, install a bot in each workspace with `chat:write` and invite it to each
configured channel. The adapter verifies the authenticated workspace and the
returned channel identity. Organizer notifications continue to use the separate
`slack-token` and `slack-organizer-channel-id` workflow parameters.

For LinkedIn, obtain Community Management API access, `w_organization_social`,
and a member grant with the required Page publishing role. The adapter uses the
Posts and Images REST APIs with version `202610`. API eligibility, access tiers,
and token renewal must be confirmed for the account; a Page administrator role
alone does not grant API access. See the dated feasibility evidence in
[ADR 0010](../adr/0010-social-publication.md#provider-feasibility).

Configure the [managed announcement export](content.md#supply-the-linkedin-announcement-image)
in `.github/meetup-content.json`. It must be PNG or JPEG, with a reviewed byte
fingerprint and managed Drive source revision. The service account must read its
source and template. Before sending, the workflow verifies current source/media,
uploads the reviewed bytes and checks that LinkedIn reports the image available
for the configured Page. A retained image is checked again on retry.

The shared schedule comes from `.github/event-publication.json`; editorial
settings and `reminderTime` come from `.github/meetup-content.json`. Keep these
files alongside the social destination list even for Slack-only use.

## Add callers

Use a published automation release containing these entry points. Replace
`RELEASE_SHA` below with its full commit SHA and keep all consumer workflow pins
consistent. The reusable workflows provide the shared per-event lock.

The scheduled scan evaluates open meetup issues in a bounded matrix. A
15-minute consumer schedule also permits unattended delivery of approved
reminders. GitHub schedules are best effort; delivery is not guaranteed at an
exact minute.

```yaml
name: Event / Publish social posts
on:
  workflow_dispatch:
  schedule:
    - cron: "*/15 * * * *"
permissions: {}
jobs:
  social:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/event-promotion-reconcile-active.yml@RELEASE_SHA
    permissions:
      contents: read
      issues: read
    with:
      meetup-event-url-prefix: ${{ vars.MEETUP_EVENT_URL_PREFIX }}
      community-event-url-prefixes: ${{ vars.COMMUNITY_EVENT_URL_PREFIXES }}
      asset-folder-url-prefix: ${{ vars.ASSET_FOLDER_URL_PREFIX }}
      locale: en
      conference-hall-event: ${{ vars.CONFERENCE_HALL_EVENT }}
      github-app-client-id: ${{ vars.CI_BOT_APP_CLIENT_ID }}
      slack-organizer-channel-id: ${{ vars.SLACK_ORGANIZER_CHANNEL_ID }}
    secrets:
      conference-hall-api-key: ${{ secrets.CONFERENCE_HALL_API_KEY }}
      github-app-private-key: ${{ secrets.CI_BOT_APP_PRIVATE_KEY }}
      slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
      social-credentials: ${{ secrets.SOCIAL_CREDENTIALS }}
```

For immediate evaluation after a publication approval edit or event change,
call [event-promotion-reconcile.yml](../../.github/workflows/event-promotion-reconcile.yml)
with the same bindings plus `issue-number`. Use the issue/approval trigger filter
from [repository setup](../usage/setup.md#process-issue-changes). Social
reconciliation consumes existing reviewed drafts; it does not generate or import
new submissions. Run content review first when processing a new draft.

## Approve and monitor

Select the confirmed host, confirm speakers, publish the registration page, and complete the
content review. A valid URL alone does not prove publication: the Meetup
publication task must also be complete. Social reconciliation then creates a
separate bot-owned publication request for each destination and purpose.

Check the exact text, destination identity, image, planned time and expiry. Edit
only the approval checkbox. The existing organizer approval mechanism validates
the editor's current repository permission and preserves the decision before any
provider write. Content approval alone never sends a public post.

Announcements become due after approval and expire at event start. D-7 and D0
use the reviewed local date and time. Reminders expire at the end of that local
day or event start, whichever comes first. Ambiguous or nonexistent local times
are rejected. Cancellation, postponement, closure, changed facts/media, removed
destinations, or revoked authority blocks unsent work. Regenerate and review
changed content. Published corrections remain manual.

Successful destinations stay complete if another destination fails. The shared
organizer checklist reports pending, blocked, uncertain and expired work by
destination and purpose, preserving tasks owned by other workflows. Provider
receipts and attempts remain in trusted bot-managed comments. Never edit or
delete their state to force another send.

Definite transient non-acceptance is retried after at least 60 seconds and any
provider `Retry-After`, with at most ten automatic attempts. The due window still
applies. Credential or permission rejection requires correction and explicit
recovery. A timeout, ambiguous response, or interrupted reservation blocks
automatic retries because the post may already exist.

## Recover a delivery

Inspect the provider before deciding whether a post exists. Call
[event-promotion-recover.yml](../../.github/workflows/event-promotion-recover.yml)
with the issue number, recorded `intent-id`, and one outcome:

- `published`: supply the Slack message permalink for the recorded channel, or
  the LinkedIn post permalink. The organizer must verify the workspace/Page and
  content; the recovery action validates reference syntax and records the
  organizer's evidence without fetching the post.
- `not-published`: supply a GitHub issue-comment URL explaining how non-publication
  was verified. If uncertain, retain the reservation.

The recovery workflow also requires `locale`, `github-app-client-id`,
`slack-organizer-channel-id`, `github-app-private-key` and `slack-token`, as shown
in its YAML contract. It requires no social provider or AI credentials and sends
no public post. It creates a separate recovery approval. Approve that exact
request and rerun the same recovery inputs to record the outcome.

A confirmed published result retains the receipt and suppresses future sends.
Confirmed non-publication permits one subsequent attempt only while current
content/publication authority and timing remain valid. Rerun social
reconciliation to update completion or retry. Recovery preserves previous
attempts and cannot overwrite an already recorded decision.
