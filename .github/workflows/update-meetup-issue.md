<!-- header:start -->

# GitHub Reusable Workflow: Update meetup issue

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Update meetup issue" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Reusable workflow that checks one open meetup issue and applies the due
communication and issue updates needed to keep it current.

The workflow creates a separate GitHub App installation token for
`<repository-owner>/mailings` using the supplied App client ID and private key.
The App must be installed there with Contents: write permission. The token is
used in the dispatch job and revoked when the job finishes; callers do not
provide a mailing token secret.

### Permissions

- **`contents`**: `read`

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
name: Update meetup issue
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  update-meetup-issue:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/update-meetup-issue.yml@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
    permissions:
      contents: read
    secrets:
      # OpenFeedback organization API key (`oforg_`) used to create and update events.
      # This input is required.
      openfeedback-api-key: ""

      # API key for the owner of the existing Kutt feedback link.
      # This input is required.
      kutt-api-key: ""

      # Google service-account JSON for Drive asset reconciliation.
      # This input is required.
      google-credentials: ""

      # PEM-encoded private key for the GitHub App identified by the github-app-client-id input. Used to mint a narrowly scoped installation token.
      # This input is required.
      github-app-private-key: ""

      # Slack bot token with chat:write and reactions:write for organizer notifications and decision reactions.
      # This input is required.
      slack-token: ""

      # Read-only Conference Hall event API key.
      # This input is required.
      conference-hall-api-key: ""
    with:
      # HTTPS event URL prefix for the authorized Meetup group, ending in /events/.
      # This input is required.
      meetup-event-url-prefix: ""

      # JSON array of nonempty HTTPS prefixes accepted for community event URLs.
      # This input is required.
      community-event-url-prefixes: ""

      # HTTPS prefix accepted for event asset folder URLs.
      # This input is required.
      asset-folder-url-prefix: ""

      # Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English.
      # This input is required.
      locale: ""

      # GitHub App client ID used to mint the narrowly scoped installation token for meetup automation.
      # This input is required.
      github-app-client-id: ""

      # Internal meetup organizer Slack channel for approval requests and actionable organizer reminders. Public announcement channels are separate.
      # This input is required.
      slack-organizer-channel-id: ""

      # Google Drive folder ID of the parent meetup folder used for asset reconciliation.
      # This input is required.
      google-drive-meetup-folder-id: ""

      # Google Drive folder ID of the template folder used for asset reconciliation.
      # This input is required.
      google-drive-meetup-template-folder-id: ""

      # HTTPS base URL of the Kutt instance, without /api/v2. No default.
      # This input is required.
      kutt-base-url: ""

      # Existing Kutt feedback link API ID.
      # This input is required.
      kutt-link-id: ""

      # Conference Hall CFP slug for live linked profiles and selected proposals.
      # This input is required.
      conference-hall-event: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                                    | **Description**                                                                                                                              | **Required** | **Type**   | **Default** |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`meetup-event-url-prefix`**                | HTTPS event URL prefix for the authorized Meetup group, ending in /events/.                                                                  | **true**     | **string** | -           |
| **`community-event-url-prefixes`**           | JSON array of nonempty HTTPS prefixes accepted for community event URLs.                                                                     | **true**     | **string** | -           |
| **`asset-folder-url-prefix`**                | HTTPS prefix accepted for event asset folder URLs.                                                                                           | **true**     | **string** | -           |
| **`locale`**                                 | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English.           | **true**     | **string** | -           |
| **`github-app-client-id`**                   | GitHub App client ID used to mint the narrowly scoped installation token for meetup automation.                                              | **true**     | **string** | -           |
| **`slack-organizer-channel-id`**             | Internal meetup organizer Slack channel for approval requests and actionable organizer reminders. Public announcement channels are separate. | **true**     | **string** | -           |
| **`google-drive-meetup-folder-id`**          | Google Drive folder ID of the parent meetup folder used for asset reconciliation.                                                            | **true**     | **string** | -           |
| **`google-drive-meetup-template-folder-id`** | Google Drive folder ID of the template folder used for asset reconciliation.                                                                 | **true**     | **string** | -           |
| **`kutt-base-url`**                          | HTTPS base URL of the Kutt instance, without /api/v2. No default.                                                                            | **true**     | **string** | -           |
| **`kutt-link-id`**                           | Existing Kutt feedback link API ID.                                                                                                          | **true**     | **string** | -           |
| **`conference-hall-event`**                  | Conference Hall CFP slug for live linked profiles and selected proposals.                                                                    | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                    | **Description**                                                                                                                             | **Required** |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **`openfeedback-api-key`**    | OpenFeedback organization API key (`oforg_`) used to create and update events.                                                              | **true**     |
| **`kutt-api-key`**            | API key for the owner of the existing Kutt feedback link.                                                                                   | **true**     |
| **`google-credentials`**      | Google service-account JSON for Drive asset reconciliation.                                                                                 | **true**     |
| **`github-app-private-key`**  | PEM-encoded private key for the GitHub App identified by the github-app-client-id input. Used to mint a narrowly scoped installation token. | **true**     |
| **`slack-token`**             | Slack bot token with chat:write and reactions:write for organizer notifications and decision reactions.                                     | **true**     |
| **`conference-hall-api-key`** | Read-only Conference Hall event API key.                                                                                                    | **true**     |

<!-- secrets:end -->
<!-- outputs:start -->
<!-- outputs:end -->
<!-- examples:start -->

## Examples

See [feedback setup and retry behavior](../../docs/integrations/feedback.md) for

the required OpenFeedback organization key and Kutt configuration. Existing

feedback URLs do not waive the credential requirements.

<!-- examples:end -->
<!-- contributing:start -->

## Contributing

Contributions are welcome! Please see the [contributing guidelines](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md) for more details.

<!-- contributing:end -->
<!-- security:start -->
<!-- security:end -->
<!-- license:start -->

## License

This project is licensed under the MIT License.

SPDX-License-Identifier: MIT

Copyright © 2026 cloud-native-aixmarseille

For more details, see the [license](http://choosealicense.com/licenses/mit/).

<!-- license:end -->
<!-- generated:start -->

---

This documentation was automatically generated by [CI Dokumentor](https://github.com/hoverkraft-tech/ci-dokumentor).

<!-- generated:end -->

## Conference Hall

The required `conference-hall-event` input and `conference-hall-api-key` secret
are forwarded explicitly to event, feedback, asset and communication actions.
See [setup, request budgeting and recovery](../../docs/integrations/conference-hall.md).
