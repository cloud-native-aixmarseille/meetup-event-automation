# Configuration

Configure the consumer repository through GitHub repository variables, secrets,
and reusable workflow inputs. Optional managed asset contracts and public field
assignments use the committed configuration described below.
The names below match the [setup examples](../usage/setup.md); the workflow
parameter names are the public contract.

## Required settings

| Consumer setting                                  | Workflow parameter                             | Used by                                   |
| ------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Variable `CI_BOT_APP_CLIENT_ID`                   | Input `github-app-client-id`                   | Event workflows and form synchronization. |
| Secret `CI_BOT_APP_PRIVATE_KEY`                   | Secret `github-app-private-key`                | Event workflows and form synchronization. |
| Variable `KUTT_BASE_URL`                          | Input `kutt-base-url`                          | Both event workflows.                     |
| Variable `KUTT_FEEDBACK_LINK_ID`                  | Input `kutt-link-id`                           | Both event workflows.                     |
| Secret `OPENFEEDBACK_API_KEY`                     | Secret `openfeedback-api-key`                  | Both event workflows.                     |
| Secret `KUTT_API_KEY`                             | Secret `kutt-api-key`                          | Both event workflows.                     |
| Secret `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`       | Secret `google-credentials`                    | Both event workflows.                     |
| Variable `GOOGLE_DRIVE_MEETUP_FOLDER_ID`          | Input `google-drive-meetup-folder-id`          | Both event workflows.                     |
| Variable `GOOGLE_DRIVE_MEETUP_TEMPLATE_FOLDER_ID` | Input `google-drive-meetup-template-folder-id` | Both event workflows.                     |
| Secret `SLACK_BOT_TOKEN`                          | Secret `slack-token`                           | Both event workflows.                     |
| Variable `SLACK_ORGANIZER_CHANNEL_ID`             | Input `slack-organizer-channel-id`             | Both event workflows.                     |

Use the GitHub App's client ID. Install the App on the consumer repository and
`mailings` under the same owner. Both event workflows generate a separate,
short-lived token for email dispatch to that owner's `mailings` repository. See
[communications](../integrations/communications.md) for permissions.

The OpenFeedback key must be an organization key beginning with `oforg_`.
It is required even when an issue already contains a feedback URL.
The Kutt link ID is the API identifier of an existing link, not its short URL.
Drive settings contain folder IDs. See [Drive](../integrations/assets.md) and
[feedback](../integrations/feedback.md) for setup requirements. The
referential/form validation workflow requires no credentials.

Pass inputs and secrets explicitly in each caller. Defining a repository secret
does not forward it to a reusable workflow.

## Meetup publication

The dedicated [Meetup publication workflow](../../.github/workflows/reconcile-meetup-event.md)
uses `MEETUP_EMAIL`, `MEETUP_PASSWORD`, and `GEMINI_API_KEY` secrets,
`GEMINI_MODEL`, and the existing App and Conference Hall settings. Its explicit
schedule and public venue mappings belong in `.github/meetup-publication.json`.
See [Meetup publication](../integrations/meetup-publication.md) for the schema,
caller, prerequisites, and interrupted-run recovery.

## Language

The required `locale` workflow input accepts English (`en`) or French (`fr`)
without a default. Use the same `locale` in all callers. Regional French variants such as `fr-FR`
resolve to French; unsupported values fall back to English. Changing locale
requires issue-form synchronization. See
[localization](../development/localization.md) for covered messages and stable
identifiers.

## Fixed conventions

These values are part of the automation release, not caller options:

| Setting                     | Value                                                               |
| --------------------------- | ------------------------------------------------------------------- |
| Event timezone              | `Europe/Paris`                                                      |
| Issue form                  | `.github/ISSUE_TEMPLATE/meetup.yml`                                 |
| Host catalog                | `referentials/hosting.csv`                                          |
| Speaker catalog             | `referentials/speakers.csv`                                         |
| Near-event readiness window | 7 days                                                              |
| Email dispatch repository   | `<consumer-repository-owner>/mailings`                              |
| Meetup event URL prefix     | `https://www.meetup.com/cloud-native-aix-marseille/events/`         |
| CNCF event URL prefix       | `https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/` |

The CNCF URL policy also accepts
`https://community.cncf.io/events/details/cncf-cloud-native-aix-marseille-presents-…`.
Use Drive folder URLs for assets and OpenFeedback event URLs for feedback.

Meetup event links must use the configured group and a positive decimal event ID
without leading zeros. Query parameters and fragments are not part of an event
identity. A final slash is optional in issue links; automation stores canonical
links with a final slash in its publication journal and approval requests.

## Labels

Create these labels in the consumer repository:

| Label                | Meaning                                 |
| -------------------- | --------------------------------------- |
| `meetup`             | Marks an issue as a meetup.             |
| `hoster:needed`      | No host has been selected.              |
| `hoster:confirmed`   | Organizer confirms the host.            |
| `speakers:needed`    | Speaker participation is not confirmed. |
| `speakers:confirmed` | Organizer confirms the speakers.        |
| `event:postponed`    | Meetup is postponed.                    |
| `event:held`         | Meetup took place.                      |
| `event:cancelled`    | Meetup is cancelled.                    |

The automation removes `hoster:needed` when a host is selected; selection does
not add `hoster:confirmed`. Speaker `needed` labels follow the confirmation state. Use at
most one `event:*` status label. An open issue without a status label is
scheduled; closing it marks it held unless an explicit status says otherwise.
The date passing alone does not mark an event held. It enables
[post-event follow-up](../integrations/communications.md#when-messages-are-due)
from the next Paris calendar day, with organizer approval still required for mail.

Email tasks use completion checkboxes. See
[approval and automatic completion](../integrations/communications.md) for task names, timing,
and duplicate protection.

`SLACK_ORGANIZER_CHANNEL_ID` selects the dedicated meetup organizer channel for
approval requests and actionable organizer reminders. Public Slack announcements remain
manual checklist tasks and have no automation channel input. See
[channel selection](../integrations/communications.md#organizer-and-public-channels).

## Conference Hall

Use the [Conference Hall guide](../integrations/conference-hall.md) for the required
`conference-hall-event` input, `conference-hall-api-key` secret, live profile refresh, reviewed identity
synchronization, selected proposals and consumer workflow triggers.

## Managed asset content

Commit `.github/meetup-asset-content.json` to opt template kinds into managed
Slides or Docs rendering, assign talk/name/portrait slots by stable identity,
and declare public venue addresses separately from private contact records.
The [asset guide](../integrations/assets.md#author-managed-content) owns the
versioned contract, event-specific configuration and recovery operations.
Without this file, templates retain copy-only behavior.
