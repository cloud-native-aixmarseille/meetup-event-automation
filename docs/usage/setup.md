# Set up a meetup repository

For browser-based creation and updates on Meetup and OCGroups, see
[event publication](../integrations/event-publication.md).

This guide configures a consumer repository to run the published automation. You
need repository administration access, a GitHub App installation, Google Drive
service-account access, a Slack bot, an OpenFeedback organization API key, and an
existing Kutt short link. See
[configuration](../reference/configuration.md) for all settings and supported conventions.

## 1. Add the event data files

Create these files in the consumer repository:

```text
.github/ISSUE_TEMPLATE/meetup.yml
referentials/hosting.csv
referentials/speakers.csv
```

Use the [meetup form](../../__tests__/meetup-issue-template.yml) from your
chosen release as the initial form. Populate the CSV files using the
[referential schemas](../reference/referentials.md). Store real contact data
only in the private consumer repository.

Create the labels listed in
[configuration](../reference/configuration.md#labels). Keep the form's field IDs
and labels: the automation uses them to read issues. The synchronization
workflow updates host and speaker choices in the existing form; it does not
create the form.

## 2. Configure credentials

Install a GitHub App on the consumer repository with these repository
permissions:

| Permission           | Used for                                               |
| -------------------- | ------------------------------------------------------ |
| Metadata: read       | Verify repository write access for approval decisions. |
| Issues: write        | Update event issues and managed comments.              |
| Contents: write      | Create the issue-form update branch.                   |
| Pull requests: write | Open the issue-form synchronization pull request.      |

Install the same App on `mailings` under the consumer repository's owner with
**Contents: write** permission for email dispatch. Each workflow creates the
repository-scoped tokens it needs and revokes them when the job ends.

Add the following repository settings:

| Type     | Name                           | Value                                                               |
| -------- | ------------------------------ | ------------------------------------------------------------------- |
| Variable | `MEETUP_EVENT_URL_PREFIX`      | Authorized Meetup group event URL prefix.                           |
| Variable | `COMMUNITY_EVENT_URL_PREFIXES` | JSON array of accepted community event URL prefixes.                |
| Variable | `ASSET_FOLDER_URL_PREFIX`      | Accepted event asset folder URL prefix.                             |
| Variable | `CONFERENCE_HALL_EVENT`        | CFP slug, such as `meetup-cloud-native-aix-marseille`.              |
| Secret   | `CONFERENCE_HALL_API_KEY`      | Read-only event key from Conference Hall's Web API settings.        |
| Variable | `CI_BOT_APP_CLIENT_ID`         | GitHub App client ID.                                               |
| Secret   | `CI_BOT_APP_PRIVATE_KEY`       | App private key in PEM format.                                      |
| Variable | `KUTT_BASE_URL`                | HTTPS base URL of the Kutt instance, without `/api/v2`; no default. |
| Variable | `KUTT_FEEDBACK_LINK_ID`        | API ID of the existing Kutt short link.                             |
| Secret   | `OPENFEEDBACK_API_KEY`         | OpenFeedback organization API key beginning with `oforg_`.          |
| Secret   | `KUTT_API_KEY`                 | API key of that link's owner.                                       |

Configure the [publication URL inputs](../reference/configuration.md#publication-url-inputs)
for your community and use the same three values in every event workflow. The
community prefix variable contains JSON, not a comma-separated string.

Both event workflows require the Conference Hall slug and API key, the
OpenFeedback key and all three Kutt settings,
including when events already have feedback URLs. Also configure the required
Drive and Slack settings:

| Type     | Name                                 | Value                                                                                       |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Secret   | `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | Service-account JSON with access to the Drive folders.                                      |
| Variable | `GOOGLE_DRIVE_FOLDER_ID`             | Parent folder ID for event assets.                                                          |
| Variable | `GOOGLE_DRIVE_PUBLIC_FOLDER_ID`      | Existing shared destination folder ID for generated PDFs; its name is unrestricted.         |
| Variable | `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID`    | Distinct folder ID containing templates.                                                    |
| Secret   | `SLACK_BOT_TOKEN`                    | Bot token with `chat:write` and `reactions:write`; invite the bot to the organizer channel. |
| Variable | `SLACK_ORGANIZER_CHANNEL_ID`         | Meetup organizer channel ID for approval requests and reminders.                            |

Set `SLACK_ORGANIZER_CHANNEL_ID` to the channel used by meetup organizers for
approvals and preparation reminders. Keep public event announcement destinations
separate; configure their allowlist and publication workflows through the
[social publication guide](../integrations/social-publication.md). See
[Slack audiences](../integrations/communications.md#organizer-and-public-channels).

Prepare [Conference Hall](../integrations/conference-hall.md),
[Drive templates](../integrations/assets.md),
[OpenFeedback and Kutt](../integrations/feedback.md), and
[email and Slack delivery](../integrations/communications.md) before running
event workflows.

## 3. Add workflow callers

Create the four files below in the consumer repository. Replace every
`RELEASE_SHA` with the same full 40-character commit SHA from a
[published release](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
that includes the features you configure. GitHub requires a literal revision in
`uses`.

### Process issue changes

Only human issue changes and human edits to managed approval comments invoke
reconciliation. GitHub App writes also emit issue events; their jobs must be
skipped to prevent the automation from retriggering itself. Scheduled audits
remain independent of this event filter.

`.github/workflows/event-reconcile.yml`:

```yaml
name: Event / Reconcile
on:
  issue_comment:
    types: [edited]
  issues:
    types: [opened, edited, reopened, assigned, unassigned, labeled, unlabeled]
permissions: {}
jobs:
  manage:
    if: >-
      ${{ !github.event.issue.pull_request &&
          github.event.issue.state == 'open' &&
          github.event.sender.type == 'User' &&
          (github.event_name != 'issue_comment' ||
           (github.event.action == 'edited' &&
            github.event.comment.user.type == 'Bot' &&
            startsWith(github.event.comment.body, '<!-- meetup-organizer-approval:v1 '))) }}
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/event-reconcile.yml@RELEASE_SHA
    permissions:
      contents: read
    with:
      issue-number: ${{ github.event.issue.number }}
      conference-hall-event: ${{ vars.CONFERENCE_HALL_EVENT }}
      meetup-event-url-prefix: ${{ vars.MEETUP_EVENT_URL_PREFIX }}
      community-event-url-prefixes: ${{ vars.COMMUNITY_EVENT_URL_PREFIXES }}
      asset-folder-url-prefix: ${{ vars.ASSET_FOLDER_URL_PREFIX }}
      locale: en
      github-app-client-id: ${{ vars.CI_BOT_APP_CLIENT_ID }}
      kutt-base-url: ${{ vars.KUTT_BASE_URL }}
      kutt-link-id: ${{ vars.KUTT_FEEDBACK_LINK_ID }}
      slack-organizer-channel-id: ${{ vars.SLACK_ORGANIZER_CHANNEL_ID }}
      google-drive-folder-id: ${{ vars.GOOGLE_DRIVE_FOLDER_ID }}
      google-drive-public-folder-id: ${{ vars.GOOGLE_DRIVE_PUBLIC_FOLDER_ID }}
      google-drive-template-folder-id: ${{ vars.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID }}
    secrets:
      conference-hall-api-key: ${{ secrets.CONFERENCE_HALL_API_KEY }}
      github-app-private-key: ${{ secrets.CI_BOT_APP_PRIVATE_KEY }}
      openfeedback-api-key: ${{ secrets.OPENFEEDBACK_API_KEY }}
      kutt-api-key: ${{ secrets.KUTT_API_KEY }}
      google-credentials: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS }}
      slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
```

### Run the daily audit

`.github/workflows/event-reconcile-active.yml`:

```yaml
name: Event / Reconcile active
on:
  workflow_dispatch:
  schedule:
    - cron: "0 9 * * *"
permissions: {}
jobs:
  audit:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/event-reconcile-active.yml@RELEASE_SHA
    permissions:
      contents: read
      issues: read
    with:
      conference-hall-event: ${{ vars.CONFERENCE_HALL_EVENT }}
      meetup-event-url-prefix: ${{ vars.MEETUP_EVENT_URL_PREFIX }}
      community-event-url-prefixes: ${{ vars.COMMUNITY_EVENT_URL_PREFIXES }}
      asset-folder-url-prefix: ${{ vars.ASSET_FOLDER_URL_PREFIX }}
      locale: en
      github-app-client-id: ${{ vars.CI_BOT_APP_CLIENT_ID }}
      kutt-base-url: ${{ vars.KUTT_BASE_URL }}
      kutt-link-id: ${{ vars.KUTT_FEEDBACK_LINK_ID }}
      slack-organizer-channel-id: ${{ vars.SLACK_ORGANIZER_CHANNEL_ID }}
      google-drive-folder-id: ${{ vars.GOOGLE_DRIVE_FOLDER_ID }}
      google-drive-public-folder-id: ${{ vars.GOOGLE_DRIVE_PUBLIC_FOLDER_ID }}
      google-drive-template-folder-id: ${{ vars.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID }}
    secrets:
      conference-hall-api-key: ${{ secrets.CONFERENCE_HALL_API_KEY }}
      github-app-private-key: ${{ secrets.CI_BOT_APP_PRIVATE_KEY }}
      openfeedback-api-key: ${{ secrets.OPENFEEDBACK_API_KEY }}
      kutt-api-key: ${{ secrets.KUTT_API_KEY }}
      google-credentials: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS }}
      slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
```

This example runs at 09:00 UTC. Calendar-day decisions use `Europe/Paris`. The
audit is needed for timed communications and the feedback link update on the day
before the event, even when nobody edits an issue.

### Synchronize the issue form

`.github/workflows/issue-form-reconcile.yml`:

```yaml
name: Update meetup issue form
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - referentials/**
      - .github/ISSUE_TEMPLATE/meetup.yml
permissions: {}
jobs:
  synchronize:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/issue-form-reconcile.yml@RELEASE_SHA
    permissions:
      contents: read
    with:
      locale: en
      github-app-client-id: ${{ vars.CI_BOT_APP_CLIENT_ID }}
    secrets:
      github-app-private-key: ${{ secrets.CI_BOT_APP_PRIVATE_KEY }}
```

Run this workflow after the initial files are on the default branch. Review and
merge its pull request before using the form. Replace `main` if your default
branch has another name.

### Validate changes to referentials and the form

`.github/workflows/referential-check-catalog-and-form.yml`:

```yaml
name: Check meetup data
on:
  pull_request:
    paths:
      - referentials/**
      - .github/ISSUE_TEMPLATE/meetup.yml
permissions: {}
jobs:
  validate:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/referential-check-catalog-and-form.yml@RELEASE_SHA
    permissions:
      contents: read
    with:
      locale: en
```

This check fails for invalid CSV data or projection errors. Stale generated
choices are advisory; the synchronization workflow updates them after merge. See
[updating referentials](../reference/referentials.md#update-the-catalogs).

Use the same `locale` in all four callers. Set it to `fr` for French generated
messages; `en` is the default.

Keep settings and release SHA identical in the two event callers. The reusable
workflows provide the per-event concurrency lock.

## 4. Verify setup

Open a Meetup issue. Check the Actions run and the diagnostic comment on the
issue. Correct any missing fields or credential errors, then follow the
[organizer guide](organize-meetup.md).

## Conference Hall

Use the [Conference Hall guide](../integrations/conference-hall.md) for the required
`conference-hall-event` input, `conference-hall-api-key` secret, live profile refresh, reviewed identity
synchronization, selected proposals and consumer workflow triggers.
