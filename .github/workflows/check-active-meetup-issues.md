<!-- header:start -->

# GitHub Reusable Workflow: Check active meetup issues

<!-- header:end -->
<!-- badges:start -->

[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Reusable workflow that checks active meetup issues, evaluates their current
state, and processes due communications under the shared per-event lock.
Audits persist refreshed Conference Hall speaker names, selected talk content
and source diagnostics in the issue. Both Conference Hall settings are required.
Communication errors are recorded in a managed meetup issue comment without
failing the audit. Execution failures and failures to read or write that comment
still fail the job. Subsequent audits update the same comment, including when
the errors are resolved. Diagnostics remain visible in annotations, outputs,
and the job summary.

Asset reconciliation passes the managed presentation URL into email approval
and delivery. See [presentation link requirements](../../docs/integrations/communications.md#presentation-link).

The workflow creates a separate GitHub App installation token for
`<repository-owner>/mailings` using the supplied App client ID and private key.
The App must be installed there with Contents: write permission. The token is
used in the dispatch job and revoked when the job finishes; callers do not
provide a mailing token secret.

### Permissions

- **`contents`**: `read`
- **`issues`**: `read`

The final organizer attention step runs after failed dependencies under the same
issue lock. It reloads the issue, retains unknown stages, persists GitHub status,
and posts or edits bounded Slack reminders. Earlier action failure policies are
preserved. See [organizer attention](../../docs/integrations/communications.md#organizer-attention)
for the timing, audit bounds, and recovery contract.

<!-- overview:end -->
<!-- usage:start -->

## Usage

Replace the placeholder revision with the full commit SHA of a published release.
Set the variables and secrets described in [repository setup](../../docs/usage/setup.md).

```yaml
name: Check active meetup issues
on:
  workflow_dispatch:
  schedule:
    - cron: "0 9 * * *"
permissions: {}
jobs:
  audit:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/check-active-meetup-issues.yml@0123456789abcdef0123456789abcdef01234567
    permissions:
      contents: read
      issues: read
    with:
      conference-hall-event: ${{ vars.CONFERENCE_HALL_EVENT }}
      locale: en
      github-app-client-id: ${{ vars.CI_BOT_APP_CLIENT_ID }}
      kutt-base-url: ${{ vars.KUTT_BASE_URL }}
      kutt-link-id: ${{ vars.KUTT_FEEDBACK_LINK_ID }}
      slack-organizer-channel-id: ${{ vars.SLACK_ORGANIZER_CHANNEL_ID }}
      google-drive-meetup-folder-id: ${{ vars.GOOGLE_DRIVE_MEETUP_FOLDER_ID }}
      google-drive-meetup-template-folder-id: ${{ vars.GOOGLE_DRIVE_MEETUP_TEMPLATE_FOLDER_ID }}
    secrets:
      conference-hall-api-key: ${{ secrets.CONFERENCE_HALL_API_KEY }}
      github-app-private-key: ${{ secrets.CI_BOT_APP_PRIVATE_KEY }}
      openfeedback-api-key: ${{ secrets.OPENFEEDBACK_API_KEY }}
      kutt-api-key: ${{ secrets.KUTT_API_KEY }}
      google-credentials: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS }}
      slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                                    | **Description**                                                                                                                              | **Required** | **Type**   | **Default** |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`conference-hall-event`**                  | Conference Hall CFP slug for live linked profiles and selected proposals.                                                                    | **true**     | **string** | -           |
| **`locale`**                                 | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English.           | **false**    | **string** | `en`        |
| **`github-app-client-id`**                   | GitHub App client ID used to mint the narrowly scoped installation token for meetup automation.                                              | **true**     | **string** | -           |
| **`slack-organizer-channel-id`**             | Internal meetup organizer Slack channel for approval requests and actionable organizer reminders. Public announcement channels are separate. | **true**     | **string** | -           |
| **`google-drive-meetup-folder-id`**          | Google Drive folder ID of the parent meetup folder used for asset reconciliation.                                                            | **true**     | **string** | -           |
| **`google-drive-meetup-template-folder-id`** | Google Drive folder ID of the template folder used for asset reconciliation.                                                                 | **true**     | **string** | -           |
| **`kutt-base-url`**                          | HTTPS base URL of the Kutt instance, without /api/v2. No default.                                                                            | **true**     | **string** | -           |
| **`kutt-link-id`**                           | Existing Kutt feedback link API ID.                                                                                                          | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                    | **Description**                                                                                                                             | **Required** |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **`conference-hall-api-key`** | Read-only Conference Hall event API key.                                                                                                    | **true**     |
| **`google-credentials`**      | Google service-account JSON for Drive asset reconciliation.                                                                                 | **true**     |
| **`github-app-private-key`**  | PEM-encoded private key for the GitHub App identified by the github-app-client-id input. Used to mint a narrowly scoped installation token. | **true**     |
| **`slack-token`**             | Slack bot token with chat:write and reactions:write for organizer notifications and decision reactions.                                     | **true**     |
| **`kutt-api-key`**            | API key for the owner of the existing Kutt feedback link.                                                                                   | **true**     |
| **`openfeedback-api-key`**    | OpenFeedback organization API key (oforg\_) used to create and update events.                                                               | **true**     |

<!-- secrets:end -->
<!-- outputs:start -->

## Outputs

| **Output**          | **Description**                                                                 |
| ------------------- | ------------------------------------------------------------------------------- |
| **`issue-numbers`** | JSON array of meetup issue numbers selected for audit during the listing phase. |

<!-- outputs:end -->
<!-- examples:start -->

See [feedback setup and retry behavior](../../docs/integrations/feedback.md) for
the required OpenFeedback organization key and Kutt configuration. Existing
feedback URLs do not waive the credential requirements.

<!-- examples:end -->
<!-- contributing:start -->
<!-- contributing:end -->
<!-- security:start -->
<!-- security:end -->
<!-- license:start -->
<!-- license:end -->
<!-- generated:start -->

---

This documentation was automatically generated by [CI Dokumentor](https://github.com/hoverkraft-tech/ci-dokumentor).

<!-- generated:end -->

## Conference Hall

The required `conference-hall-event` input and `conference-hall-api-key` secret
are forwarded explicitly to event, feedback, asset and communication actions.
See [setup, request budgeting and recovery](../../docs/integrations/conference-hall.md).
